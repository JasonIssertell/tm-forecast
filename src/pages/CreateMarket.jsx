import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function CreateMarket() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [closeTime, setCloseTime] = useState('17:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!question.trim()) {
      setError('Please enter a question')
      return
    }

    if (!closeDate) {
      setError('Please select a close date')
      return
    }

    const closeDatetime = new Date(`${closeDate}T${closeTime}`)
    if (closeDatetime <= new Date()) {
      setError('Close date must be in the future')
      return
    }

    setSubmitting(true)

    try {
      const { data, error: insertError } = await supabase
        .from('markets')
        .insert({
          question: question.trim(),
          description: description.trim() || null,
          created_by: user.id,
          close_date: closeDatetime.toISOString(),
          status: 'open',
          yes_pool: 100,
          no_pool: 100
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Record initial price
      await supabase.from('price_history').insert({
        market_id: data.id,
        yes_price: 0.5
      })

      navigate(`/markets/${data.id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link to="/markets" className="text-masters-400 hover:text-masters-200 text-sm mb-6 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Markets
      </Link>

      <div className="card p-6 sm:p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-display text-masters-50">Create Market</h1>
            <p className="text-masters-400 text-sm">Add a new prediction question</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question */}
          <div>
            <label htmlFor="question" className="label">
              Question <span className="text-red-400">*</span>
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input-field w-full"
              placeholder="Will we achieve 76% FOB margin on irons?"
              required
            />
            <p className="text-masters-600 text-xs mt-2">
              Phrase as a yes/no question. Be specific and unambiguous.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label">
              Description <span className="text-masters-600">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full h-24 resize-none"
              placeholder="Additional context or criteria for resolution..."
            />
          </div>

          {/* Close Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="closeDate" className="label">
                Close Date <span className="text-red-400">*</span>
              </label>
              <input
                id="closeDate"
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                min={today}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="closeTime" className="label">
                Close Time <span className="text-red-400">*</span>
              </label>
              <input
                id="closeTime"
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-fairway p-4 rounded-lg border border-masters-800">
            <p className="text-masters-400 text-xs mb-2">Preview</p>
            <p className="text-masters-50 font-medium">
              {question || 'Your question will appear here...'}
            </p>
            {description && (
              <p className="text-masters-400 text-sm mt-1">{description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-green-400">Yes: 50%</span>
              <span className="text-red-400">No: 50%</span>
            </div>
            {closeDate && (
              <p className="text-masters-500 text-xs mt-2">
                Closes: {new Date(`${closeDate}T${closeTime}`).toLocaleString()}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/markets')}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-gold flex-1 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Market'}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 rounded-lg border border-masters-800/50 animate-fade-in stagger-2">
        <h3 className="text-masters-300 text-sm font-medium mb-2">Tips for good markets</h3>
        <ul className="text-masters-500 text-sm space-y-1">
          <li>• Be specific about what "yes" and "no" mean</li>
          <li>• Set a clear resolution criteria</li>
          <li>• Give enough time for people to bet</li>
          <li>• Questions about TaylorMade business outcomes work best</li>
        </ul>
      </div>
    </div>
  )
}
