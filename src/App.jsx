import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function IndicatorCombinations() {
  const [expandedScenarios, setExpandedScenarios] = useState(new Set());
  const [filterBias, setFilterBias] = useState('all');
  const [filterStrength, setFilterStrength] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  // Generate all possible combinations
  const scenarios = useMemo(() => {
    const combinations = [];
    let id = 0;

    // Band Containment (mutually exclusive)
    const containmentStates = [
      { close_in_vwap: 1, vwap_in_close: 0, separated: 0, label: 'CLOSE IN VWAP' },
      { close_in_vwap: 0, vwap_in_close: 1, separated: 0, label: 'VWAP IN CLOSE' },
      { close_in_vwap: 0, vwap_in_close: 0, separated: 1, label: 'SEPARATED' },
      { close_in_vwap: 0, vwap_in_close: 0, separated: 0, label: 'OVERLAP' }
    ];

    // SuperTrend vs P3D VWAP (mutually exclusive)
    const stStates = [
      { st_above: 1, st_below: 0, st_within: 0, label: 'ABOVE P3D VWAP' },
      { st_above: 0, st_below: 1, st_within: 0, label: 'BELOW P3D VWAP' },
      { st_above: 0, st_below: 0, st_within: 1, label: 'WITHIN P3D VWAP' }
    ];

    // pdClose1 Band 1 Position
    const band1States = [
      { value: 2, label: 'HIGH BAND 1' },
      { value: -2, label: 'LOW BAND 1' },
      { value: 0, label: 'NEUTRAL 1' }
    ];

    // pdClose1 Band 2 Position
    const band2States = [
      { value: 2, label: 'HIGH BAND 2' },
      { value: -2, label: 'LOW BAND 2' },
      { value: 0, label: 'NEUTRAL 2' }
    ];

    // Close price position when volume just turned rising
    const closePriceStates = [
      { label: 'Above ST Avg & VWAP', code: 'above_both' },
      { label: 'Above ST Avg, Below VWAP', code: 'above_st_below_vwap' },
      { label: 'Below ST Avg, Above VWAP', code: 'below_st_above_vwap' },
      { label: 'Below Both ST Avg & VWAP', code: 'below_both' },
      { label: 'Between ST Min & Avg', code: 'between_st' },
      { label: 'Between ST Max & Avg', code: 'between_st_down' }
    ];

    // Generate all combinations
    for (const containment of containmentStates) {
      for (const st of stStates) {
        for (const band1 of band1States) {
          for (const band2 of band2States) {
            for (const pricePos of closePriceStates) {
              const scenario = {
                id: id++,
                vol_rising: 1,
                vol_just_turned: true,
                ...containment,
                ...st,
                band1_value: band1.value,
                band1_label: band1.label,
                band2_value: band2.value,
                band2_label: band2.label,
                price_position: pricePos.label,
                price_position_code: pricePos.code
              };

              // Calculate bias and strength
              const analysis = analyzeScenario(scenario);
              combinations.push({ ...scenario, ...analysis });
            }
          }
        }
      }
    }

    return combinations;
  }, []);

  // Analyze scenario for bias and strength
  function analyzeScenario(scenario) {
    let bullish_score = 0;
    let bearish_score = 0;
    const signals = [];
    const warnings = [];

    // Band 1 (Primary Bias) - Weight: 3
    if (scenario.band1_value === 2) {
      bullish_score += 3;
      signals.push('✓2: Primary bullish bias (HIGH BAND 1)');
    } else if (scenario.band1_value === -2) {
      bearish_score += 3;
      signals.push('✓2: Primary bearish bias (LOW BAND 1)');
    } else {
      warnings.push('✓2: Neutral zone - no clear bias');
    }

    // Band 2 (Confirmation) - Weight: 2
    if (scenario.band2_value === 2) {
      bullish_score += 2;
      signals.push('✓3: Bullish confirmation (HIGH BAND 2)');
    } else if (scenario.band2_value === -2) {
      bearish_score += 2;
      signals.push('✓3: Bearish confirmation (LOW BAND 2)');
    } else {
      warnings.push('✓3: Neutral confirmation');
    }

    // SuperTrend vs P3D VWAP (Momentum) - Weight: 3
    if (scenario.st_above === 1) {
      bullish_score += 3;
      signals.push('✓4: Strong bullish momentum (ST ABOVE P3D)');
    } else if (scenario.st_below === 1) {
      bearish_score += 3;
      signals.push('✓4: Strong bearish momentum (ST BELOW P3D)');
    } else {
      warnings.push('✓4: Ranging momentum (ST WITHIN P3D)');
    }

    // Band Containment (Structure) - Weight: 1
    if (scenario.close_in_vwap === 1) {
      warnings.push('✓5: Compression (CLOSE IN VWAP) - Breakout pending');
    } else if (scenario.vwap_in_close === 1) {
      bullish_score += 1;
      bearish_score += 1;
      signals.push('✓5: Expansion phase (VWAP IN CLOSE) - Trending');
    } else if (scenario.separated === 1) {
      bullish_score += 1;
      bearish_score += 1;
      signals.push('✓5: Clear separation - Strong trend expected');
    } else {
      warnings.push('✓5: Partial overlap - Transitional');
    }

    // Price Position Analysis (when volume just turned rising)
    if (scenario.price_position_code === 'above_both') {
      bullish_score += 2;
      signals.push('Price: Above ST & VWAP - Bullish positioning');
    } else if (scenario.price_position_code === 'below_both') {
      bearish_score += 2;
      signals.push('Price: Below ST & VWAP - Bearish positioning');
    } else if (scenario.price_position_code === 'above_st_below_vwap') {
      bullish_score += 1;
      warnings.push('Price: Above ST but below VWAP - Mixed signal');
    } else if (scenario.price_position_code === 'below_st_above_vwap') {
      bearish_score += 1;
      warnings.push('Price: Below ST but above VWAP - Mixed signal');
    } else if (scenario.price_position_code === 'between_st') {
      bullish_score += 1;
      signals.push('Price: Pullback to ST support zone');
    } else if (scenario.price_position_code === 'between_st_down') {
      bearish_score += 1;
      signals.push('Price: Rejection from ST resistance zone');
    }

    // Check for conflicts
    const conflicts = [];
    if (scenario.band1_value === 2 && scenario.st_below === 1) {
      conflicts.push('MAJOR: Band 1 bullish but ST below P3D VWAP');
    }
    if (scenario.band1_value === -2 && scenario.st_above === 1) {
      conflicts.push('MAJOR: Band 1 bearish but ST above P3D VWAP');
    }
    if (scenario.band1_value === 2 && scenario.band2_value === -2) {
      conflicts.push('Band 1/2 conflict: Different bias levels');
    }
    if (scenario.band1_value === -2 && scenario.band2_value === 2) {
      conflicts.push('Band 1/2 conflict: Different bias levels');
    }

    // Determine bias
    let bias = 'NEUTRAL';
    let bias_strength = 'WEAK';
    const score_diff = Math.abs(bullish_score - bearish_score);

    if (bullish_score > bearish_score) {
      bias = 'BULLISH';
      if (score_diff >= 6) bias_strength = 'VERY STRONG';
      else if (score_diff >= 4) bias_strength = 'STRONG';
      else if (score_diff >= 2) bias_strength = 'MODERATE';
      else bias_strength = 'WEAK';
    } else if (bearish_score > bullish_score) {
      bias = 'BEARISH';
      if (score_diff >= 6) bias_strength = 'VERY STRONG';
      else if (score_diff >= 4) bias_strength = 'STRONG';
      else if (score_diff >= 2) bias_strength = 'MODERATE';
      else bias_strength = 'WEAK';
    } else {
      bias = 'NEUTRAL';
      bias_strength = 'CONFLICTED';
    }

    // Trade recommendation
    let trade_action = 'WAIT';
    let entry_type = '';
    
    if (conflicts.length > 0) {
      trade_action = 'DO NOT TRADE';
      entry_type = 'Conflicting signals';
    } else if (bias === 'BULLISH' && (bias_strength === 'STRONG' || bias_strength === 'VERY STRONG')) {
      trade_action = 'LOOK FOR LONG';
      if (scenario.price_position_code === 'between_st' || scenario.price_position_code === 'above_st_below_vwap') {
        entry_type = 'Pullback entry to ST support';
      } else if (scenario.close_in_vwap === 1) {
        entry_type = 'Wait for breakout above VWAP band';
      } else {
        entry_type = 'Breakout entry on continuation';
      }
    } else if (bias === 'BEARISH' && (bias_strength === 'STRONG' || bias_strength === 'VERY STRONG')) {
      trade_action = 'LOOK FOR SHORT';
      if (scenario.price_position_code === 'between_st_down' || scenario.price_position_code === 'below_st_above_vwap') {
        entry_type = 'Pullback entry to ST resistance';
      } else if (scenario.close_in_vwap === 1) {
        entry_type = 'Wait for breakout below VWAP band';
      } else {
        entry_type = 'Breakout entry on continuation';
      }
    } else if (bias === 'BULLISH' && bias_strength === 'MODERATE') {
      trade_action = 'CAUTIOUS LONG';
      entry_type = 'Conservative position, tight stops';
    } else if (bias === 'BEARISH' && bias_strength === 'MODERATE') {
      trade_action = 'CAUTIOUS SHORT';
      entry_type = 'Conservative position, tight stops';
    } else {
      trade_action = 'WAIT';
      entry_type = 'Insufficient alignment for entry';
    }

    return {
      bullish_score,
      bearish_score,
      bias,
      bias_strength,
      signals,
      warnings,
      conflicts,
      trade_action,
      entry_type
    };
  }

  // Filter and sort scenarios
  const filteredScenarios = useMemo(() => {
    let filtered = scenarios;

    if (filterBias !== 'all') {
      filtered = filtered.filter(s => s.bias === filterBias.toUpperCase());
    }

    if (filterStrength !== 'all') {
      filtered = filtered.filter(s => s.bias_strength === filterStrength.toUpperCase());
    }

    // Sort
    if (sortBy === 'score') {
      filtered = [...filtered].sort((a, b) => {
        const aScore = Math.abs(a.bullish_score - a.bearish_score);
        const bScore = Math.abs(b.bullish_score - b.bearish_score);
        return bScore - aScore;
      });
    } else if (sortBy === 'bullish') {
      filtered = [...filtered].sort((a, b) => b.bullish_score - a.bullish_score);
    } else if (sortBy === 'bearish') {
      filtered = [...filtered].sort((a, b) => b.bearish_score - a.bearish_score);
    }

    return filtered;
  }, [scenarios, filterBias, filterStrength, sortBy]);

  const toggleExpanded = (id) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Statistics
  const stats = useMemo(() => {
    const total = scenarios.length;
    const bullish = scenarios.filter(s => s.bias === 'BULLISH').length;
    const bearish = scenarios.filter(s => s.bias === 'BEARISH').length;
    const neutral = scenarios.filter(s => s.bias === 'NEUTRAL').length;
    const tradeable = scenarios.filter(s => s.trade_action === 'LOOK FOR LONG' || s.trade_action === 'LOOK FOR SHORT').length;
    const conflicts = scenarios.filter(s => s.conflicts.length > 0).length;

    return { total, bullish, bearish, neutral, tradeable, conflicts };
  }, [scenarios]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        
        body { font-family: 'JetBrains Mono', monospace; }
        .title-font { font-family: 'Space Grotesk', sans-serif; }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);
        }
        
        .scenario-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.3);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .scenario-card:hover {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(15, 23, 42, 0.8);
        }
        
        .badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .filter-btn {
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        
        .filter-btn.active {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgb(99, 102, 241);
        }
        
        .scroll-fade {
          mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.5); }
        }
        
        .glow-border {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="title-font text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            P2D Regime Analyzer
          </h1>
          <p className="text-slate-400 text-sm uppercase tracking-widest">
            Volume Rising Scenario Explorer · GBPUSD 1H
          </p>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="stat-card rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="stat-card rounded-lg p-4">
            <div className="text-green-400 text-xs uppercase tracking-wider mb-1">Bullish</div>
            <div className="text-2xl font-bold text-green-400">{stats.bullish}</div>
          </div>
          <div className="stat-card rounded-lg p-4">
            <div className="text-red-400 text-xs uppercase tracking-wider mb-1">Bearish</div>
            <div className="text-2xl font-bold text-red-400">{stats.bearish}</div>
          </div>
          <div className="stat-card rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Neutral</div>
            <div className="text-2xl font-bold text-slate-300">{stats.neutral}</div>
          </div>
          <div className="stat-card rounded-lg p-4">
            <div className="text-cyan-400 text-xs uppercase tracking-wider mb-1">Tradeable</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.tradeable}</div>
          </div>
          <div className="stat-card rounded-lg p-4">
            <div className="text-orange-400 text-xs uppercase tracking-wider mb-1">Conflicts</div>
            <div className="text-2xl font-bold text-orange-400">{stats.conflicts}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="stat-card rounded-lg p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Bias Filter */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Filter by Bias</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'bullish', 'bearish', 'neutral'].map(bias => (
                  <button
                    key={bias}
                    onClick={() => setFilterBias(bias)}
                    className={`filter-btn px-3 py-1.5 rounded text-xs ${filterBias === bias ? 'active' : 'bg-slate-800/50'}`}
                  >
                    {bias.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Strength Filter */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Filter by Strength</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'very strong', 'strong', 'moderate', 'weak'].map(strength => (
                  <button
                    key={strength}
                    onClick={() => setFilterStrength(strength)}
                    className={`filter-btn px-3 py-1.5 rounded text-xs ${filterStrength === strength ? 'active' : 'bg-slate-800/50'}`}
                  >
                    {strength.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-1.5 text-xs"
              >
                <option value="score">Score Difference</option>
                <option value="bullish">Bullish Score</option>
                <option value="bearish">Bearish Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-center text-slate-400 text-sm mb-4">
          Showing {filteredScenarios.length} of {stats.total} scenarios
        </div>

        {/* Scenarios List */}
        <div className="space-y-3 scroll-fade max-h-[800px] overflow-y-auto pr-2">
          {filteredScenarios.map(scenario => {
            const isExpanded = expandedScenarios.has(scenario.id);
            const biasColor = scenario.bias === 'BULLISH' ? 'text-green-400' : 
                            scenario.bias === 'BEARISH' ? 'text-red-400' : 'text-slate-400';
            
            return (
              <div key={scenario.id} className="scenario-card rounded-lg overflow-hidden">
                {/* Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(scenario.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-lg font-bold ${biasColor}`}>
                          {scenario.bias === 'BULLISH' ? <TrendingUp className="inline w-5 h-5" /> :
                           scenario.bias === 'BEARISH' ? <TrendingDown className="inline w-5 h-5" /> :
                           <Minus className="inline w-5 h-5" />}
                          {' '}{scenario.bias}
                        </span>
                        <span className="badge bg-indigo-500/20 text-indigo-300">
                          {scenario.bias_strength}
                        </span>
                        <span className={`badge ${
                          scenario.trade_action === 'LOOK FOR LONG' ? 'bg-green-500/20 text-green-300' :
                          scenario.trade_action === 'LOOK FOR SHORT' ? 'bg-red-500/20 text-red-300' :
                          scenario.trade_action === 'DO NOT TRADE' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {scenario.trade_action}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Band 1:</span>{' '}
                          <span className={
                            scenario.band1_value === 2 ? 'text-green-400' :
                            scenario.band1_value === -2 ? 'text-red-400' : 'text-slate-400'
                          }>
                            {scenario.band1_label}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Band 2:</span>{' '}
                          <span className={
                            scenario.band2_value === 2 ? 'text-green-400' :
                            scenario.band2_value === -2 ? 'text-red-400' : 'text-slate-400'
                          }>
                            {scenario.band2_label}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">ST Position:</span>{' '}
                          <span className={
                            scenario.st_above === 1 ? 'text-green-400' :
                            scenario.st_below === 1 ? 'text-red-400' : 'text-orange-400'
                          }>
                            {scenario.label}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Structure:</span>{' '}
                          <span className="text-cyan-400">{scenario.containment.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Score</div>
                        <div className="flex gap-2">
                          <span className="text-green-400 font-bold">+{scenario.bullish_score}</span>
                          <span className="text-slate-600">|</span>
                          <span className="text-red-400 font-bold">{scenario.bearish_score}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Positive Signals
                          </h4>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {scenario.signals.map((sig, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">●</span>
                                <span>{sig}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {scenario.warnings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> Warnings
                            </h4>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {scenario.warnings.map((warn, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-yellow-400 mt-0.5">●</span>
                                  <span>{warn}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {scenario.conflicts.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                              <XCircle className="w-4 h-4" /> Conflicts
                            </h4>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {scenario.conflicts.map((conf, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5">●</span>
                                  <span>{conf}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 rounded p-3 border border-slate-700">
                          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Price Position (Vol Turn)</h4>
                          <p className="text-xs text-slate-300">{scenario.price_position}</p>
                        </div>

                        <div className={`rounded p-3 border ${
                          scenario.trade_action === 'LOOK FOR LONG' ? 'bg-green-500/10 border-green-500/30' :
                          scenario.trade_action === 'LOOK FOR SHORT' ? 'bg-red-500/10 border-red-500/30' :
                          scenario.trade_action === 'DO NOT TRADE' ? 'bg-orange-500/10 border-orange-500/30' :
                          'bg-slate-800/50 border-slate-700'
                        }`}>
                          <h4 className="text-sm font-semibold mb-2">Trade Recommendation</h4>
                          <p className="text-lg font-bold mb-1">{scenario.trade_action}</p>
                          <p className="text-xs text-slate-300">{scenario.entry_type}</p>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1">
                          <div>Scenario ID: {scenario.id}</div>
                          <div>Bullish Score: {scenario.bullish_score}</div>
                          <div>Bearish Score: {scenario.bearish_score}</div>
                          <div>Score Diff: {Math.abs(scenario.bullish_score - scenario.bearish_score)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredScenarios.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No scenarios match the selected filters
          </div>
        )}
      </div>
    </div>
  );
}
