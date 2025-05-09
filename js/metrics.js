/**
 * Metrics module for tracking and displaying performance metrics
 */

// Metrics configuration
const METRICS_CONFIG = Object.freeze({
  TYPES: [
    'asr_latency',
    'llm_network_latency',
    'llm_first_token',
    'tts_network_latency',
    'tts_first_frame_latency',
    'tts_discontinuity',
    'interruption'
  ],
  // Display labels for metrics in the UI
  DISPLAY_LABELS: {
    asr_latency: 'asr',
    llm_first_token: 'llm',
    tts_first_frame_latency: 'tts '
    // Commented metrics are not displayed in the UI
    // llm_network_latency: 'llm_net',
    // tts_network_latency: 'tts_net',
    // tts_discontinuity: 'tts_dic',
    // interruption: 'interrupt'
  }
});

// Metrics data storage
let metricsData = createEmptyMetricsData();

/**
 * Creates a fresh metrics data object
 * @returns {Object} Empty metrics data structure
 */
function createEmptyMetricsData() {
  return METRICS_CONFIG.TYPES.reduce((obj, metric) => {
    obj[metric] = [];
    return obj;
  }, {});
}

/**
 * Records a metric value
 * @param {string} metric - The metric name
 * @param {number} value - The metric value
 * @param {string} roundId - The conversation round ID
 */
function recordMetric(metric, value, roundId) {
  if (metricsData.hasOwnProperty(metric)) {
    metricsData[metric].push({
      value,
      roundId
    });
    console.log(`Recorded metric: ${metric} = ${value}ms for round ${roundId}`);
  }
}

/**
 * Resets all metrics data
 */
function resetMetrics() {
  metricsData = createEmptyMetricsData();
}

/**
 * Calculates statistics for an array of values
 * @param {number[]} values - Array of metric values
 * @returns {Object|null} Statistics object or null if no values
 */
function calculateStatistics(values) {
  if (!values.length) return null;
  
  return {
    count: values.length,
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Calculates and displays latency statistics
 */
function displayLatencyStatistics() {
  try {
    // Calculate statistics for each metric
    const statistics = {};
    
    Object.keys(metricsData).forEach(metric => {
      const values = metricsData[metric].map(item => item.value);
      const stats = calculateStatistics(values);
      if (stats) {
        statistics[metric] = stats;
      }
    });
    
    // If no metrics were recorded
    if (Object.keys(statistics).length === 0) {
      addSystemMessage("No latency metrics recorded");
      return;
    }
    
    // Build the metrics table
    let table = "metrics(ms):\n";
    table += "🕹️  | avg | min | max | *\n";
    
    Object.entries(METRICS_CONFIG.DISPLAY_LABELS).forEach(([metric, label]) => {
      const stat = statistics[metric];
      if (stat) {
        table += `${label} | ${stat.avg} | ${stat.min} | ${stat.max} | ${stat.count}\n`;
      }
    });
    
    // Add the summary to the chat
    addSystemMessage(table);
  } catch (error) {
    console.error('Error calculating metrics statistics:', error);
  }
} 