const gql = String.raw;

export const playStatsTypes = gql`
  # ─── Stats ───

  type SpinScratchStats {
    totalSpins: Int!
    totalScratches: Int!
    totalMatchWins: Int!
    totalTcBurned: Int!
    totalTcRewarded: Int!
    netTcBurned: Int!
    spinStatsToday: DayStats!
    scratchStatsToday: DayStats!
    matchWinStatsToday: DayStats!
  }

  type DayStats {
    plays: Int!
    tcBurned: Int!
    tcRewarded: Int!
  }

  extend type Query {
    getSpinScratchStats: SpinScratchStats!
  }
`;
