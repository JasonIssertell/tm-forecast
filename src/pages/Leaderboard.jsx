import { useState, useEffect } from 'react'
import { supabase, formatCurrency } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Leaderboard() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)

    // Fetch all users with their positions
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, balance')
      .order('balance', { ascending: false })

    if (!profiles) {
      setLoading(false)
      return
    }

    // Fetch all positions with market data
    const { data: allPositions } = await supabase
      .from('positions')
      .select(`
        user_id,
        side,
        shares,
        markets (
          status,
          yes_pool,
          no_pool
        )
      `)

    // Calculate total portfolio value for each user
    const leaderboardData = profiles.map(profile => {
      const userPositions = allPositions?.filter(p => p.user_id === profile.id) || []
      let positionValue = 0

      userPositions.forEach(pos => {
        if (pos.markets?.status === 'open' || pos.markets?.status === 'closed') {
          const yesPool = parseFloat(pos.markets.yes_pool)
          const noPool = parseFloat(pos.markets.no_pool)
          const price = pos.side === 'yes' 
            ? yesPool / (yesPool + noPool)
            : noPool / (yesPool + noPool)
          positionValue += parseFloat(pos.shares) * price
        }
      })

      const totalValue = parseFloat(profile.balance) + positionValue
      const pnl = totalValue - 1000

      return {
        ...profile,
        positionValue,
        totalValue,
        pnl
      }
    })

    // Sort by total value
    leaderboardData.sort((a, b) => b.totalValue - a.totalValue)

    setLeaderboard(leaderboardData)
    setLoading(false)
  }

  const getRankStyle = (rank) => {
    if (rank === 1) return 'from-yellow-500/30 to-yellow-600/10 border-yellow-500/50'
    if (rank === 2) return 'from-gray-400/20 to-gray-500/5 border-gray-400/40'
    if (rank === 3) return 'from-amber-700/20 to-amber-800/5 border-amber-600/40'
    return 'from-transparent to-transparent border-masters-800'
  }

  const getMedal = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  const userRank = leaderboard.findIndex(l => l.id === user?.id) + 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl font-display text-masters-50 mb-2">Leaderboard</h1>
        <p className="text-masters-400">Top forecasters compete for glory</p>
      </div>

      {/* User's rank card */}
      {userRank > 0 && (
        <div className="card p-6 mb-8 animate-fade-in stagger-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center">
                <span className="text-gold-500 font-bold">#{userRank}</span>
              </div>
              <div>
                <p className="text-masters-400 text-sm">Your Ranking</p>
                <p className="text-masters-50 font-medium">
                  {userRank <= 3 ? 'You\'re in the top 3!' : `${userRank} of ${leaderboard.length} forecasters`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-masters-400 text-sm">Total Value</p>
              <p className="text-gold-500 text-xl font-bold">
                {formatCurrency(leaderboard[userRank - 1]?.totalValue || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prize info */}
      <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in stagger-3">
        <div className="card p-4 text-center bg-gradient-to-b from-yellow-500/20 to-transparent border-yellow-500/30">
          <div className="text-3xl mb-2">🥇</div>
          <div className="text-yellow-500 font-bold">1st Place</div>
          <div className="text-masters-400 text-sm">Top Prize</div>
        </div>
        <div className="card p-4 text-center bg-gradient-to-b from-gray-400/20 to-transparent border-gray-400/30">
          <div className="text-3xl mb-2">🥈</div>
          <div className="text-gray-300 font-bold">2nd Place</div>
          <div className="text-masters-400 text-sm">Runner Up</div>
        </div>
        <div className="card p-4 text-center bg-gradient-to-b from-amber-600/20 to-transparent border-amber-600/30">
          <div className="text-3xl mb-2">🥉</div>
          <div className="text-amber-500 font-bold">3rd Place</div>
          <div className="text-masters-400 text-sm">Third Prize</div>
        </div>
      </div>

      {/* Leaderboard table */}
      {loading ? (
        <div className="card animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b border-masters-800">
              <div className="h-12 bg-masters-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-masters-500">No forecasters yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-in stagger-4">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-masters-900/50 border-b border-masters-800 text-masters-400 text-sm font-medium">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Forecaster</div>
            <div className="col-span-2 text-right">Cash</div>
            <div className="col-span-2 text-right">Positions</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-masters-800">
            {leaderboard.map((entry, index) => {
              const rank = index + 1
              const isCurrentUser = entry.id === user?.id
              
              return (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all
                    ${isCurrentUser ? 'bg-gold-500/10' : 'hover:bg-masters-900/30'}
                    ${rank <= 3 ? `bg-gradient-to-r ${getRankStyle(rank)}` : ''}
                  `}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    <span className={`text-xl ${rank <= 3 ? '' : 'text-masters-500'}`}>
                      {getMedal(rank)}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                        ${rank === 1 ? 'bg-yellow-500/30 text-yellow-400' : 
                          rank === 2 ? 'bg-gray-400/30 text-gray-300' :
                          rank === 3 ? 'bg-amber-600/30 text-amber-500' :
                          'bg-masters-800 text-masters-400'}
                      `}>
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-medium ${isCurrentUser ? 'text-gold-500' : 'text-masters-50'}`}>
                          {entry.name}
                          {isCurrentUser && <span className="text-gold-500/70 text-xs ml-2">(You)</span>}
                        </p>
                        {rank <= 3 && (
                          <p className="text-xs text-masters-500">
                            {rank === 1 ? 'Leading the pack' : rank === 2 ? 'Close behind' : 'In contention'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cash */}
                  <div className="col-span-2 text-right">
                    <span className="text-masters-300">{formatCurrency(entry.balance)}</span>
                  </div>

                  {/* Position Value */}
                  <div className="col-span-2 text-right">
                    <span className="text-masters-400">{formatCurrency(entry.positionValue)}</span>
                  </div>

                  {/* Total Value */}
                  <div className="col-span-2 text-right">
                    <div className={`font-bold ${rank <= 3 ? 'text-lg' : ''} ${
                      rank === 1 ? 'text-yellow-400' :
                      rank === 2 ? 'text-gray-300' :
                      rank === 3 ? 'text-amber-500' :
                      'text-masters-50'
                    }`}>
                      {formatCurrency(entry.totalValue)}
                    </div>
                    <div className={`text-xs ${entry.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.pnl >= 0 ? '+' : ''}{formatCurrency(entry.pnl)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-masters-600 text-xs mt-8">
        Rankings update in real-time based on cash balance + current position values
      </p>
    </div>
  )
}
