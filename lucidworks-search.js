console.log('Lucidworks Search script loaded');

function blockMintlifyAndInjectCustomModal(selector, launchHandler) {
  const button = document.querySelector(selector);
  if (!button) return;

  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    launchHandler();
  };

  const clone = button.cloneNode(true);
  button.replaceWith(clone);
  clone.addEventListener('click', handler, true);
}

function launchLucidworksModal() {
  if (document.getElementById('lucidworks-search-modal')) return;

  // Add Font Awesome for search icon
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }

  const modal = document.createElement('div');
  modal.id = 'lucidworks-search-modal';
  modal.className = 'lw-modal-overlay';

  modal.innerHTML = `
    <div class="lw-modal-container collapsed" id="lucidworks-modal-container">
      <div class="lw-search-input-wrapper">
        <div class="lw-search-toggle-container" id="lw-search-toggle-container">
          <label class="lw-toggle-switch lw-search-toggle-switch">
            <input type="checkbox" id="search-toggle-switch">
            <span class="lw-search-toggle-slider"></span>
          </label>
        </div>
        <div class="lw-search-icon-container" id="lw-search-icon-container" style="display: none;">
          <i class="fas fa-search lw-search-icon"></i>
        </div>
        <input id="lucidworks-search-input" class="lw-search-input" type="text" placeholder="Search" />
      </div>
      <div id="lw-ai-toggle-btn-container"></div>
      <div id="lucidworks-search-results-wrapper" class="lw-results-wrapper">
        <div id="lucidworks-search-facets" class="lw-facets-container"></div>
        <div class="lw-main-results-area">
          <div class="lw-results-header">
            <div id="lw-results-toggle-container" class="lw-results-toggle-container" style="display: none;">
              <div class="lw-results-segmented-toggle">
                <div class="lw-results-segment lw-results-segment-keyword active">Hybrid</div>
                <div class="lw-results-segment lw-results-segment-conversation">Conversation</div>
                <div class="lw-results-segment-slider"></div>
              </div>
            </div>
            <h2 id="lw-query-heading" class="lw-query-heading" style="display: none;"></h2>
          </div>
          <div id="lucidworks-search-results" class="lw-results-container"></div>
          <div id="lucidworks-pagination" class="lw-pagination"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('lw-modal-open');

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('lw-modal-open');
    }
  });

  modal.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: true });

  const input = document.getElementById('lucidworks-search-input');
  const modalContainer = document.getElementById('lucidworks-modal-container');
  const resultsContainer = document.getElementById('lucidworks-search-results');
  const paginationContainer = document.getElementById('lucidworks-pagination');
  const aiToggleBtnContainer = document.getElementById('lw-ai-toggle-btn-container');
  const facetsContainer = document.getElementById('lucidworks-search-facets');
  const searchToggleSwitch = document.getElementById('search-toggle-switch');
  const searchToggleContainer = document.getElementById('lw-search-toggle-container');
  const searchIconContainer = document.getElementById('lw-search-icon-container');
  const resultsToggleContainer = document.getElementById('lw-results-toggle-container');
  const queryHeading = document.getElementById('lw-query-heading');
  
  // Get segmented toggle elements
  const resultsSegmentedToggle = document.querySelector('.lw-results-segmented-toggle');
  const keywordSegment = document.querySelector('.lw-results-segment-keyword');
  const conversationSegment = document.querySelector('.lw-results-segment-conversation');

  let currentMode = 'search';
  let currentQuery = '';
  let currentStart = 0;
  let isProcessing = false;
  const rows = 10;
  let selectedFacets = {};

  // Add click handlers for the segmented toggle
  keywordSegment.addEventListener('click', () => {
    if (isProcessing || currentMode === 'search') return;
    
    // Update UI
    keywordSegment.classList.add('active');
    conversationSegment.classList.remove('active');
    resultsSegmentedToggle.classList.remove('ai-active');
    
    // Update search toggle to match
    searchToggleSwitch.checked = false;
    
    // Set mode and fetch results
    currentMode = 'search';
    input.placeholder = "Search anything";
    resultsContainer.classList.remove('lw-results-ai');
    
    if (currentQuery.trim()) {
      fetchAndRenderSearch(currentQuery, 0);
    }
  });
  
  conversationSegment.addEventListener('click', () => {
    if (isProcessing || currentMode === 'ai') return;
    
    // Update UI
    keywordSegment.classList.remove('active');
    conversationSegment.classList.add('active');
    resultsSegmentedToggle.classList.add('ai-active');
    
    // Update search toggle to match
    searchToggleSwitch.checked = true;
    
    // Set mode and fetch results
    currentMode = 'ai';
    input.placeholder = "Ask LWAI anything";
    resultsContainer.classList.add('lw-results-ai');
    
    if (currentQuery.trim()) {
      fetchAndRenderSearch(currentQuery, 0);
    }
  });

  // Add toggle switch event listeners
  searchToggleSwitch.addEventListener('change', function() {
    console.log('Search toggle state:', this.checked ? 'ON' : 'OFF');

    if (this.checked) {
      // AI mode is on
      input.placeholder = "Ask LWAI anything";
      resultsContainer.classList.add('lw-results-ai');
      
      // Update segmented toggle to match
      keywordSegment.classList.remove('active');
      conversationSegment.classList.add('active');
      resultsSegmentedToggle.classList.add('ai-active');
      
      currentMode = 'ai';
      if (currentQuery.trim()) {
        fetchAndRenderSearch(currentQuery, 0);
      }
    } else {
      // Regular search mode
      input.placeholder = "Search anything";
      resultsContainer.classList.remove('lw-results-ai');
      
      // Update segmented toggle to match
      keywordSegment.classList.add('active');
      conversationSegment.classList.remove('active');
      resultsSegmentedToggle.classList.remove('ai-active');
      
      currentMode = 'search';
      if (currentQuery.trim()) {
        fetchAndRenderSearch(currentQuery, 0);
      }
    }
  });

  input.focus();

  function renderSkeletons(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'lw-skeleton';
      container.appendChild(skeleton);
    }
  }

  function setMode(mode) {
    // Basic protection against rapid switching
    if (isProcessing) return;

    currentMode = mode;
    
    // Clear previous UI elements
    resultsContainer.innerHTML = '';
    paginationContainer.innerHTML = '';
    aiToggleBtnContainer.innerHTML = '';
    facetsContainer.innerHTML = '';

    // Configure UI based on mode
    if (mode === 'ai') {
      facetsContainer.style.display = 'none';
      input.placeholder = "Ask a question...";
      
      // Update toggle states to match the mode
      searchToggleSwitch.checked = true;
      keywordSegment.classList.remove('active');
      conversationSegment.classList.add('active');
      resultsSegmentedToggle.classList.add('ai-active');
      
      input.focus();
      if (currentQuery.trim()) {
        renderSkeletons(resultsContainer, 3);
        fetchAndRenderSearch(currentQuery, 0);
      } else {
        resultsContainer.innerHTML = '<div class="lw-ai-placeholder">Enter your question above and press Enter to ask Lucidworks AI</div>';
      }
    } else { // search mode
      facetsContainer.style.display = 'block';
      input.placeholder = "Search anything";
      
      // Update toggle states to match the mode
      searchToggleSwitch.checked = false;
      keywordSegment.classList.add('active');
      conversationSegment.classList.remove('active');
      resultsSegmentedToggle.classList.remove('ai-active');
      
      if (currentQuery.trim()) {
        renderSkeletons(resultsContainer, rows);
        fetchAndRenderSearch(currentQuery, 0);
      }
    }
  }

  async function fetchAndRenderSearch(query, start = 0) {
    if (!query.trim()) return;

    isProcessing = true;
    currentQuery = query;
    currentStart = start;

    // Always expand modal when displaying results
    modalContainer.classList.remove('collapsed');
    modalContainer.classList.add('expanded');

    try {
      // Ensure toggle remains visible in the search bar
      searchToggleContainer.style.display = 'block';
      searchIconContainer.style.display = 'none';
      resultsToggleContainer.style.display = 'block';

      // Display the query as an H2 heading
      queryHeading.textContent = query;
      queryHeading.style.display = 'block';

      // Show the correct interface based on the current mode
      if (currentMode === 'ai') {
        console.log("Fetching AI results for:", query);
        facetsContainer.style.display = 'none';
        
        const url = `https://lw-docs-dev.b.lucidworks.cloud/api/apps/Docs_Site_AI/query/Docs_Site_AI_NHS_RAG?q=${encodeURIComponent(query)}`;
        const auth = btoa('docs:rkJqpLsyAf9Dbu]TVRm6DT%N');
        
        renderSkeletons(resultsContainer, 3);
        paginationContainer.innerHTML = '';
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          resultsContainer.innerHTML = '<div class="lw-result-description">Error retrieving AI results.</div>';
          return;
        }
        
        const data = await res.json();
        console.log("AI API response:", data);
        
        const aiAnswer = data?.fusion?.llm_answer;
        const sources = data?.fusion?.llm_source_docs || [];
        
        resultsContainer.innerHTML = '';
        
        if (aiAnswer) {
          // Process AI answer to add line break after first sentence if multiple sentences exist
          let processedAnswer = aiAnswer;
          const sentences = aiAnswer.split(/(?<=[.!?])\s+/);
          if (sentences.length > 1) {
            processedAnswer = sentences[0] + '<br><br>' + sentences.slice(1).join(' ');
          }
          
          const answerBlock = document.createElement('div');
          answerBlock.className = 'lw-result-item';
          answerBlock.innerHTML = `
            <div class="lw-result-description" style="display: flex; align-items: flex-start; gap: 8px;">
              <img src="https://storage.googleapis.com/docs-downloads/mintlify-site/ai-icon-dark-gray.svg" style="width: 24px; height: 24px; flex-shrink: 0; margin-top: 2px;" />
              <div style="flex: 1; padding-right: 16px;">${processedAnswer}</div>
            </div>`;
          resultsContainer.appendChild(answerBlock);
        } else {
          resultsContainer.innerHTML = '<div class="lw-result-description">No AI answer returned.</div>';
        }
        
        if (sources.length > 0) {
          const sourcesHeading = document.createElement('div');
          sourcesHeading.className = 'lw-sources-heading';
          sourcesHeading.textContent = 'Sources';
          resultsContainer.appendChild(sourcesHeading);
          
          const sourcesContainer = document.createElement('div');
          sourcesContainer.className = 'lw-sources-container';
          
          sources.forEach((doc) => {
            const docBlock = document.createElement('div');
            docBlock.className = 'lw-result-item';
            docBlock.style.cursor = 'pointer';
            
            const link = document.createElement('a');
            link.href = doc.url_s || '#';
            link.target = '_blank';
            link.className = 'lw-result-title';
            link.textContent = doc.title_s || doc.url_s || 'Source Document';
            docBlock.appendChild(link);
            
            docBlock.addEventListener('click', () => {
              window.open(doc.url_s || '#', '_blank');
            });
            
            sourcesContainer.appendChild(docBlock);
          });
          
          resultsContainer.appendChild(sourcesContainer);
        }
      } else {
        // Show facets in search mode
        facetsContainer.style.display = 'block';
        
        let facetQuery = '';
        const selectedFacetValues = [];
        for (const facet in selectedFacets) {
          if (selectedFacets[facet].length > 0) {
            selectedFacetValues.push(...selectedFacets[facet]);
          }
        }
        
        if (selectedFacetValues.length > 0) {
          facetQuery = `&fq=productName_pretty:("${selectedFacetValues.join('","')}")`;
        }
        
        const url = `https://lw-docs-dev.b.lucidworks.cloud/api/apps/Docs_Site_AI/query/Docs_Site_AI_NHS_RAG?start=${start}&rows=${rows}&q=${encodeURIComponent(query)}&facet=true&facet.field=productName_pretty${facetQuery}`;
        const auth = btoa('docs:rkJqpLsyAf9Dbu]TVRm6DT%N');
        
        renderSkeletons(resultsContainer, rows);
        paginationContainer.innerHTML = '';
        facetsContainer.innerHTML = '';
        aiToggleBtnContainer.innerHTML = '';
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          resultsContainer.innerHTML = 'Search failed.';
          return;
        }
        
        const data = await res.json();
        const docs = data.response?.docs || [];
        const numFound = data.response?.numFound || 0;
        
        // Render facets
        if (data.facet_counts?.facet_fields?.productName_pretty) {
          renderFacets(data.facet_counts.facet_fields.productName_pretty);
        }
        
        if (!docs.length) {
          resultsContainer.innerHTML = '<div class="lw-no-results">No results found. Try asking Lucidworks AI instead.</div>';
          facetsContainer.style.display = 'none';
          return;
        }
        
        resultsContainer.innerHTML = docs.map(doc => {
          const title = doc.title_s || 'Untitled';
          const description = doc.description || '';
          const url = doc.url_s || '#';
          
          return `
            <div class="lw-result-item">
              <a href="${url}" target="_blank" class="lw-result-title">${title}</a>
              <div class="lw-result-description">${description}</div>
            </div>
          `;
        }).join('');
        
        const totalPages = Math.ceil(numFound / rows);
        const currentPage = Math.floor(start / rows) + 1;
        
        let paginationHTML = '';
        if (currentPage > 1) {
          paginationHTML += `<button class="lw-page-button" data-start="${(currentPage - 2) * rows}">Previous</button>`;
        }
        if (currentPage < totalPages) {
          paginationHTML += `<button class="lw-page-button" data-start="${currentPage * rows}">Next</button>`;
        }
        paginationContainer.innerHTML = paginationHTML;
        
        paginationContainer.querySelectorAll('.lw-page-button').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const newStart = parseInt(e.target.getAttribute('data-start'), 10);
            fetchAndRenderSearch(currentQuery, newStart);
          });
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      resultsContainer.innerHTML = currentMode === 'ai' 
        ? '<div class="lw-result-description">An error occurred while fetching AI results.</div>' 
        : 'An error occurred.';
    } finally {
      isProcessing = false;
    }
  }

  function renderFacets(facetData) {
    if (!facetData || facetData.length === 0) return;

    // Aggregate duplicate facets
    const aggregatedFacets = {};
    for (let i = 0; i < facetData.length; i += 2) {
      const combinedFacetValue = facetData[i];
      const facetCount = facetData[i + 1];

      // Split combined facet values by commas and trim whitespace
      const individualFacets = combinedFacetValue.split(',').map(facet => facet.trim());

      individualFacets.forEach(facetValue => {
        if (aggregatedFacets[facetValue]) {
          aggregatedFacets[facetValue] += facetCount;
        } else {
          aggregatedFacets[facetValue] = facetCount;
        }
      });
    }

    facetsContainer.innerHTML = '';
    const facetList = document.createElement('div');
    facetList.className = 'lw-facets-list';

    // Render aggregated facets with prettified names and formatted counts
    Object.entries(aggregatedFacets).forEach(([facetValue, facetCount]) => {
      let prettifiedName = facetValue
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word

      // Apply specific replacements
      if (prettifiedName === 'Lw Platform') {
        prettifiedName = 'Lucidworks Platform';
      } else if (prettifiedName === 'Fusion Ai') {
        prettifiedName = 'Fusion AI';
      }

      const formattedCount = facetCount.toLocaleString(); // Format count with commas

      const facetItem = document.createElement('div');
      facetItem.className = 'lw-facet-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `facet-${facetValue}`;
      checkbox.className = 'lw-facet-checkbox';
      checkbox.value = facetValue;

      if (selectedFacets['productName_pretty'] && selectedFacets['productName_pretty'].includes(facetValue)) {
        checkbox.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor = `facet-${facetValue}`;
      label.className = 'lw-facet-label';
      label.textContent = `${prettifiedName} (${formattedCount})`;

      checkbox.addEventListener('change', (e) => {
        if (!selectedFacets['productName_pretty']) {
          selectedFacets['productName_pretty'] = [];
        }

        if (e.target.checked) {
          if (!selectedFacets['productName_pretty'].includes(facetValue)) {
            selectedFacets['productName_pretty'].push(facetValue);
          }
        } else {
          selectedFacets['productName_pretty'] = selectedFacets['productName_pretty'].filter(
            val => val !== facetValue
          );
        }

        fetchAndRenderSearch(currentQuery, 0);
      });

      facetItem.appendChild(checkbox);
      facetItem.appendChild(label);
      facetList.appendChild(facetItem);
    });

    facetsContainer.appendChild(facetList);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (!query) return;
      
      // Reset facets for new searches
      selectedFacets = {};
      
      // Run the search based on the current toggle state
      currentMode = searchToggleSwitch.checked ? 'ai' : 'search';
      
      // Make sure the modal is expanded for results
      modalContainer.classList.remove('collapsed');
      modalContainer.classList.add('expanded');
      
      fetchAndRenderSearch(query, 0);
    }
  });

  setMode('search');
}

// Update the blockMintlifyAndInjectCustomModal function to handle the ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('lucidworks-search-modal');
    if (modal) {
      modal.remove();
      document.body.classList.remove('lw-modal-open');
    }
  }
});

function init() {
  blockMintlifyAndInjectCustomModal('#search-bar-entry', launchLucidworksModal);
  blockMintlifyAndInjectCustomModal('#search-bar-entry-mobile', launchLucidworksModal);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
