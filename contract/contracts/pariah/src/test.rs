#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

/// Spin up an env with a native-like SAC token, three funded bettors, and a
/// deployed + initialized PARIAH market closing at `close_ledger`.
struct Fixture<'a> {
    env: Env,
    client: PariahClient<'a>,
    token: TokenClient<'a>,
    admin: Address,
    alice: Address,
    bob: Address,
    carol: Address,
}

fn setup(close_ledger: u32) -> Fixture<'static> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    // A Stellar Asset Contract stands in for the native XLM SAC in tests.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_address = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token_address);
    let token = TokenClient::new(&env, &token_address);
    token_admin.mint(&alice, &1000);
    token_admin.mint(&bob, &1000);
    token_admin.mint(&carol, &1000);

    let contract_id = env.register(Pariah, ());
    let client = PariahClient::new(&env, &contract_id);
    let question = String::from_str(&env, "Will BTC close above $100k Friday?");
    client.initialize(&admin, &token_address, &question, &close_ledger);

    Fixture {
        env,
        client,
        token,
        admin,
        alice,
        bob,
        carol,
    }
}

#[test]
fn test_bet_pools_and_stakes() {
    let f = setup(200);
    f.client.bet(&f.alice, &true, &100);
    f.client.bet(&f.bob, &true, &300);
    f.client.bet(&f.carol, &false, &400);

    let m = f.client.get_market();
    assert_eq!(m.pool_yes, 400);
    assert_eq!(m.pool_no, 400);
    assert_eq!(f.client.get_stake(&f.alice, &true), 100);
    assert_eq!(f.client.get_stake(&f.bob, &true), 300);
    assert_eq!(f.client.get_stake(&f.carol, &false), 400);

    // Tokens actually moved into the contract.
    assert_eq!(f.token.balance(&f.alice), 900);
    assert_eq!(f.token.balance(&f.bob), 700);
    assert_eq!(f.token.balance(&f.carol), 600);
}

#[test]
fn test_resolve_and_payout_math() {
    let f = setup(200);
    // YES pool = 400 (alice 100 + bob 300), NO pool = 400 (carol).
    f.client.bet(&f.alice, &true, &100);
    f.client.bet(&f.bob, &true, &300);
    f.client.bet(&f.carol, &false, &400);

    f.env.ledger().set_sequence_number(200);
    f.client.resolve(&true);

    let m = f.client.get_market();
    assert!(m.resolved);
    assert!(m.outcome);

    // total pool = 800, winning pool = 400.
    // alice: 100 * 800 / 400 = 200 ; bob: 300 * 800 / 400 = 600.
    let alice_payout = f.client.claim(&f.alice);
    assert_eq!(alice_payout, 200);
    assert_eq!(f.token.balance(&f.alice), 900 + 200);

    let bob_payout = f.client.claim(&f.bob);
    assert_eq!(bob_payout, 600);
    assert_eq!(f.token.balance(&f.bob), 700 + 600);

    // Whole pool has been paid out; loser gets nothing.
    assert_eq!(f.token.balance(&f.carol), 600);
    assert!(f.client.has_claimed(&f.alice));
}

#[test]
fn test_bet_after_close_fails() {
    let f = setup(200);
    f.env.ledger().set_sequence_number(200);
    let res = f.client.try_bet(&f.alice, &true, &100);
    assert_eq!(res, Err(Ok(Error::MarketClosed)));
}

#[test]
fn test_zero_amount_rejected() {
    let f = setup(200);
    let res = f.client.try_bet(&f.alice, &true, &0);
    assert_eq!(res, Err(Ok(Error::ZeroAmount)));
}

#[test]
fn test_claim_before_resolve_fails() {
    let f = setup(200);
    f.client.bet(&f.alice, &true, &100);
    let res = f.client.try_claim(&f.alice);
    assert_eq!(res, Err(Ok(Error::NotResolved)));
}

#[test]
fn test_double_claim_fails() {
    let f = setup(200);
    f.client.bet(&f.alice, &true, &100);
    f.client.bet(&f.carol, &false, &100);
    f.env.ledger().set_sequence_number(200);
    f.client.resolve(&true);

    f.client.claim(&f.alice);
    let res = f.client.try_claim(&f.alice);
    assert_eq!(res, Err(Ok(Error::AlreadyClaimed)));
}

#[test]
fn test_loser_has_nothing_to_claim() {
    let f = setup(200);
    f.client.bet(&f.alice, &true, &100);
    f.client.bet(&f.carol, &false, &100);
    f.env.ledger().set_sequence_number(200);
    f.client.resolve(&true); // YES wins, carol (NO) loses

    let res = f.client.try_claim(&f.carol);
    assert_eq!(res, Err(Ok(Error::NothingToClaim)));
}

#[test]
fn test_resolve_before_close_fails() {
    let f = setup(200);
    // Still at ledger 100, before close_ledger 200.
    let res = f.client.try_resolve(&true);
    assert_eq!(res, Err(Ok(Error::TooEarly)));
}
