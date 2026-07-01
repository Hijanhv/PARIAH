#![no_std]

//! PARIAH — an on-chain, real-time pari-mutuel prediction market.
//!
//! "Bet against the crowd. The pool doesn't lie."
//!
//! Users stake a token (the native XLM SAC on testnet) on YES/NO of a binary
//! question. Odds are derived live from the on-chain pools, pari-mutuel style.
//! After the market closes, the admin resolves the outcome and winners claim
//! their proportional slice of the entire pool.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

// ~5s ledgers -> a day is ~17280 ledgers. Keep contract data alive for ~30 days
// so the demo market survives well past its close/resolve/claim lifecycle.
const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    MarketClosed = 3,
    AlreadyResolved = 4,
    NotResolved = 5,
    ZeroAmount = 6,
    AlreadyClaimed = 7,
    NotAdmin = 8,
    NothingToClaim = 9,
    TooEarly = 10,
}

/// The full market state. Returned by `get_market` so the frontend can render
/// the tote board, countdown, admin panel and resolution in one read.
#[contracttype]
#[derive(Clone)]
pub struct Market {
    pub admin: Address,
    pub stake_token: Address,
    pub question: String,
    pub close_ledger: u32,
    pub pool_yes: i128,
    pub pool_no: i128,
    pub resolved: bool,
    pub outcome: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The single `Market` struct (instance storage).
    Market,
    /// Per-user, per-side staked amount: Stake(user, side) -> i128.
    Stake(Address, bool),
    /// Guards against double-claims: Claimed(user) -> bool.
    Claimed(Address),
}

#[contract]
pub struct Pariah;

#[contractimpl]
impl Pariah {
    /// One-time setup. `stake_token` is the token address bettors stake in
    /// (the native XLM Stellar Asset Contract on testnet). `close_ledger` is the
    /// ledger sequence at/after which betting stops and the market can resolve.
    pub fn initialize(
        env: Env,
        admin: Address,
        stake_token: Address,
        question: String,
        close_ledger: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Market) {
            return Err(Error::AlreadyInitialized);
        }
        let market = Market {
            admin,
            stake_token,
            question,
            close_ledger,
            pool_yes: 0,
            pool_no: 0,
            resolved: false,
            outcome: false,
        };
        env.storage().instance().set(&DataKey::Market, &market);
        env.storage()
            .instance()
            .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    /// Stake `amount` of the stake token on `side` (true = YES, false = NO).
    /// Transfers `amount` from `better` into the contract and grows the pool.
    pub fn bet(env: Env, better: Address, side: bool, amount: i128) -> Result<(), Error> {
        better.require_auth();

        let mut market = Self::load_market(&env)?;
        if market.resolved {
            return Err(Error::AlreadyResolved);
        }
        if env.ledger().sequence() >= market.close_ledger {
            return Err(Error::MarketClosed);
        }
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        // Pull the stake into the contract. The token's own `transfer` requires
        // `better`'s auth; it is covered by the same signed authorization tree.
        token::TokenClient::new(&env, &market.stake_token).transfer(
            &better,
            &env.current_contract_address(),
            &amount,
        );

        if side {
            market.pool_yes += amount;
        } else {
            market.pool_no += amount;
        }

        let stake_key = DataKey::Stake(better.clone(), side);
        let prior: i128 = env.storage().persistent().get(&stake_key).unwrap_or(0);
        env.storage().persistent().set(&stake_key, &(prior + amount));
        env.storage()
            .persistent()
            .extend_ttl(&stake_key, BUMP_THRESHOLD, BUMP_AMOUNT);

        env.storage().instance().set(&DataKey::Market, &market);
        env.storage()
            .instance()
            .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        // Live feed + live odds recompute are driven off this event.
        env.events().publish(
            (symbol_short!("bet"), better),
            (side, amount, market.pool_yes, market.pool_no),
        );
        Ok(())
    }

    /// Admin-only. Locks in the winning `outcome` once the market has closed.
    pub fn resolve(env: Env, outcome: bool) -> Result<(), Error> {
        let mut market = Self::load_market(&env)?;
        market.admin.require_auth();

        if market.resolved {
            return Err(Error::AlreadyResolved);
        }
        if env.ledger().sequence() < market.close_ledger {
            return Err(Error::TooEarly);
        }

        market.resolved = true;
        market.outcome = outcome;
        env.storage().instance().set(&DataKey::Market, &market);
        env.storage()
            .instance()
            .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        env.events().publish(
            (symbol_short!("resolve"),),
            (outcome, market.pool_yes, market.pool_no),
        );
        Ok(())
    }

    /// Winner withdrawal. Pays `better` their proportional slice of the entire
    /// pool: winning_stake * total_pool / winning_pool. Guards double-claims.
    pub fn claim(env: Env, better: Address) -> Result<i128, Error> {
        better.require_auth();

        let market = Self::load_market(&env)?;
        if !market.resolved {
            return Err(Error::NotResolved);
        }
        if env
            .storage()
            .persistent()
            .get(&DataKey::Claimed(better.clone()))
            .unwrap_or(false)
        {
            return Err(Error::AlreadyClaimed);
        }

        let winning_stake: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Stake(better.clone(), market.outcome))
            .unwrap_or(0);
        if winning_stake <= 0 {
            return Err(Error::NothingToClaim);
        }

        let total_pool = market.pool_yes + market.pool_no;
        let winning_pool = if market.outcome {
            market.pool_yes
        } else {
            market.pool_no
        };
        // winning_stake > 0 implies winning_pool >= winning_stake > 0, so this
        // division is always safe.
        let payout = winning_stake * total_pool / winning_pool;

        env.storage()
            .persistent()
            .set(&DataKey::Claimed(better.clone()), &true);
        env.storage().persistent().extend_ttl(
            &DataKey::Claimed(better.clone()),
            BUMP_THRESHOLD,
            BUMP_AMOUNT,
        );

        token::TokenClient::new(&env, &market.stake_token).transfer(
            &env.current_contract_address(),
            &better,
            &payout,
        );

        env.events()
            .publish((symbol_short!("claim"), better), (payout,));
        Ok(payout)
    }

    /// Read the full market state (config + live pools + resolution).
    pub fn get_market(env: Env) -> Result<Market, Error> {
        Self::load_market(&env)
    }

    /// Read a single user's staked amount on a given side.
    pub fn get_stake(env: Env, user: Address, side: bool) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Stake(user, side))
            .unwrap_or(0)
    }

    /// Whether a user has already claimed their winnings.
    pub fn has_claimed(env: Env, user: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Claimed(user))
            .unwrap_or(false)
    }

    fn load_market(env: &Env) -> Result<Market, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Market)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
