import type { ProductAnalysis } from '../types/product';
import type { ChatMessage } from './llmChat';

export function exportToHTML(
  analyses: ProductAnalysis[],
  aggregateAnalysis: ProductAnalysis | null,
  mode: 'single' | 'comparison' | 'aggregate',
  chatMessages: ChatMessage[] = []
) {
  const title = mode === 'aggregate' 
    ? 'Aggregate Sentiment Report' 
    : mode === 'comparison' 
      ? 'Product Comparison Report' 
      : `${analyses[0]?.title || 'Product'} Sentiment Report`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --primary: #3b82f6;
            --primary-dark: #1d4ed8;
            --secondary: #64748b;
            --success: #22c55e;
            --danger: #ef4444;
            --warning: #f59e0b;
            --background: #f8fafc;
            --card: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border: #e2e8f0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--background);
            color: var(--text-primary);
            margin: 0;
            padding: 40px 20px;
            line-height: 1.5;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 40px;
            text-align: center;
        }
        h1 { margin: 0; color: var(--text-primary); font-size: 2.5rem; }
        .date { color: var(--text-secondary); margin-top: 8px; font-size: 0.9rem; }
        
        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 20px;
        }
        @media (max-width: 768px) { .grid { grid-template-cols: 1fr; } }
        
        .stat-grid {
            display: grid;
            grid-template-cols: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .stat-item {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-value { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .stat-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; }

        /* Sentiment Bar */
        .sentiment-container { margin-bottom: 12px; }
        .sentiment-label-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; }
        .bar-bg { background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 5px; }
        
        /* Tags */
        .tag-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
        .tag-positive { background: #dcfce7; color: #166534; }
        .tag-negative { background: #fee2e2; color: #991b1b; }
        .tag-neutral { background: #f1f5f9; color: #475569; }

        /* Selling Points */
        .point-item { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
        .point-icon { background: var(--primary); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.8rem; font-weight: bold; }
        
        /* Chat History */
        .chat-bubbles { display: flex; flex-direction: column; gap: 12px; }
        .bubble { max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 0.9rem; }
        .bubble-user { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 4px; }
        .bubble-assistant { align-self: flex-start; background: #f1f5f9; color: var(--text-primary); border-bottom-left-radius: 4px; }

        /* Filter UI */
        .filter-bar {
            background: #fff;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid var(--border);
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
        }
        .filter-select {
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            font-size: 0.85rem;
            outline: none;
        }
        .filter-select:focus { border-color: var(--primary); }

        /* Review List */
        .review-item { border-bottom: 1px solid var(--border); padding: 16px 0; display: block; }
        .review-item:last-child { border-bottom: none; }
        .review-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .review-rating { color: var(--warning); font-weight: bold; }
        .review-sentiment { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 700; }
        .review-text { font-size: 0.9rem; color: var(--text-primary); }

        .footer { text-align: center; margin-top: 60px; color: var(--text-secondary); font-size: 0.8rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        </div>

        ${mode === 'aggregate' || mode === 'comparison' 
          ? renderMultipleAnalyses(analyses, aggregateAnalysis, mode)
          : renderSingleAnalysis(analyses[0])
        }

        ${chatMessages.length > 0 ? `
        <div class="card">
            <h4 class="card-title">Assistant Chat History</h4>
            <div class="chat-bubbles">
                ${chatMessages.map(m => `
                    <div class="bubble bubble-${m.role}">
                        <strong>${m.role === 'user' ? 'You' : 'Assistant'}</strong><br>
                        ${m.content.replace(/\n/g, '<br>')}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            Generated by Sentiment Intelligence AI
        </div>
    </div>

    <script>
        function filterReviews() {
            const sentimentFilter = document.getElementById('sentimentFilter').value;
            const ratingFilter = document.getElementById('ratingFilter').value;
            const reviews = document.querySelectorAll('.review-item');

            reviews.forEach(review => {
                const sentiment = review.getAttribute('data-sentiment');
                const rating = Math.round(parseFloat(review.getAttribute('data-rating')));
                
                const matchesSentiment = sentimentFilter === 'all' || sentiment === sentimentFilter;
                const matchesRating = ratingFilter === 'all' || rating === parseInt(ratingFilter);

                if (matchesSentiment && matchesRating) {
                    review.style.display = 'block';
                } else {
                    review.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>
  `;

  function renderSingleAnalysis(a: ProductAnalysis) {
    if (!a) return '';
    return `
        <div class="card">
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${a.overallRating.toFixed(1)}</div>
                    <div class="stat-label">Overall Rating</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${a.overallReviewCount}</div>
                    <div class="stat-label">Total Reviews</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${a.sentimentSummary.total > 0 ? (a.sentimentSummary.positive / a.sentimentSummary.total * 100).toFixed(0) : 0}%</div>
                    <div class="stat-label">Positive</div>
                </div>
            </div>
            
            <div class="grid">
                <div>
                    <h4 class="card-title">Sentiment Analysis</h4>
                    ${renderSentimentBar('Positive', a.sentimentSummary.positive / a.sentimentSummary.total, '#22c55e')}
                    ${renderSentimentBar('Mixed', a.sentimentSummary.mixed / a.sentimentSummary.total, '#64748b')}
                    ${renderSentimentBar('Negative', a.sentimentSummary.negative / a.sentimentSummary.total, '#ef4444')}
                </div>
                <div>
                    <h4 class="card-title">Top Selling Points</h4>
                    ${a.topSellingPoints.map((p, i) => `
                        <div class="point-item">
                            <div class="point-icon">${i + 1}</div>
                            <div style="font-size: 0.9rem;">
                                <strong>${p.theme}</strong>: ${p.description}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h4 class="card-title">Key Attributes</h4>
                <div class="tag-container">
                    ${a.attributeCounts.slice(0, 15).map(attr => `
                        <div class="tag tag-neutral">${attr.attribute} (${attr.count})</div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <h4 class="card-title">Top Keywords</h4>
                <div class="tag-container">
                    ${a.topKeywords.slice(0, 15).map(kw => `
                        <div class="tag tag-neutral">${kw.text} (${kw.value})</div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="card">
            <h4 class="card-title">Review List</h4>
            
            <div class="filter-bar">
                <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Filters:</span>
                <select id="sentimentFilter" class="filter-select" onchange="filterReviews()">
                    <option value="all">All Sentiments</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="mixed">Mixed</option>
                </select>
                <select id="ratingFilter" class="filter-select" onchange="filterReviews()">
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                </select>
            </div>

            <div id="reviewContainer">
                ${a.reviews.slice(0, 100).map(r => `
                    <div class="review-item" data-sentiment="${r.sentiment.classification}" data-rating="${r.rating}">
                        <div class="review-header">
                            <span class="review-rating">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</span>
                            <span class="review-sentiment tag tag-${r.sentiment.classification === 'positive' ? 'positive' : r.sentiment.classification === 'negative' ? 'negative' : 'neutral'}">${r.sentiment.classification}</span>
                        </div>
                        <div class="review-text">${r.text}</div>
                        <div class="tag-container" style="margin-top: 8px;">
                            ${r.keywords.slice(0, 3).map(k => `<span class="tag tag-neutral" style="font-size: 0.7rem; padding: 2px 8px;">${k}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
  }

  function renderMultipleAnalyses(analyses: ProductAnalysis[], aggregate: ProductAnalysis | null, mode: string) {
    let content = '';
    
    if (mode === 'aggregate' && aggregate) {
        content += `<div class="card"><h2 style="margin-top:0">Aggregate Summary</h2>${renderSingleAnalysis(aggregate)}</div>`;
    }

    content += analyses.map(a => `
        <div style="margin-top: 40px;">
            <h2 style="border-bottom: 2px solid var(--primary); padding-bottom: 8px;">${a.title}</h2>
            ${renderSingleAnalysis(a)}
        </div>
    `).join('');

    return content;
  }

  function renderSentimentBar(label: string, value: number, color: string) {
    const percent = Math.round(value * 100);
    return `
        <div class="sentiment-container">
            <div class="sentiment-label-row">
                <span>${label}</span>
                <span>${percent}%</span>
            </div>
            <div class="bar-bg">
                <div class="bar-fill" style="width: ${percent}%; background-color: ${color};"></div>
            </div>
        </div>
    `;
  }

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
