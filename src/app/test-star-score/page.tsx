"use client"

import React, { useState } from 'react'
import { StarScoreVisualizer } from '@/components/ui/StarScoreVisualizer'
import { HomeLayout } from '@/components/layout/HomeLayout'

export default function TestStarScorePage() {
  const [score, setScore] = useState(74)
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md')

  const scores = [0, 25, 50, 74, 100]

  return (
    <HomeLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            Star Score Visualizer Demo
          </h1>

          {/* Interactive Demo */}
          <div className="bg-muted rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Interactive Demo
            </h2>
            
            <div className="flex flex-col items-center space-y-6">
              <StarScoreVisualizer 
                score={score} 
                size={size}
                className="mb-4"
              />
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex flex-col items-center">
                  <label className="text-white mb-2">Score</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-48"
                  />
                  <span className="text-white mt-1">{score}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <label className="text-white mb-2">Size</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                    className="bg-background text-white border border-border rounded px-3 py-1"
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Size Comparison */}
          <div className="bg-muted rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Size Comparison (Score: 74)
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 justify-items-center">
              <div className="text-center">
                <StarScoreVisualizer score={74} size="sm" />
                <p className="text-white mt-2">Small</p>
              </div>
              <div className="text-center">
                <StarScoreVisualizer score={74} size="md" />
                <p className="text-white mt-2">Medium</p>
              </div>
              <div className="text-center">
                <StarScoreVisualizer score={74} size="lg" />
                <p className="text-white mt-2">Large</p>
              </div>
            </div>
          </div>

          {/* Score Examples */}
          <div className="bg-muted rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Score Examples
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8 justify-items-center">
              {scores.map((scoreValue) => (
                <div key={scoreValue} className="text-center">
                  <StarScoreVisualizer 
                    score={scoreValue} 
                    size="md"
                  />
                  <p className="text-white mt-2 font-semibold">{scoreValue} / 100</p>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Example */}
          <div className="bg-muted rounded-xl p-8 mt-12">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Usage Example
            </h2>
            
            <div className="bg-background rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Code:</h3>
              <pre className="text-green-400 text-sm overflow-x-auto">
{`<StarScoreVisualizer score={74} />`}
              </pre>
              
              <h3 className="text-lg font-semibold text-white mb-4 mt-6">Result:</h3>
              <div className="flex justify-center">
                <StarScoreVisualizer score={74} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  )
}
