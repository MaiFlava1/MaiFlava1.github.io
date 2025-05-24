const galleryContainer = document.getElementById('gallery-container');
const galleryLoadingElements = document.querySelectorAll('.gallery-loading');
const INITIAL_LOAD_COUNT = 4;
const LOAD_MORE_COUNT = 1;
const MAX_GALLERY_INDEX = 1000;
const BATCH_SEARCH_STEP = 10;

let lastFoundGalleryEntry = 0;
let lastFoundHighlightEntry = 0;
let currentLoadedCount = 0;
let isLoading = false;
let loadingSentinel = null;
let highlightItemsLoaded = false;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading) {
            if (!highlightItemsLoaded) {
                loadMoreHighlightItems();
            } else if (lastFoundGalleryEntry - currentLoadedCount > 0) {
                loadMoreGalleryItems();
            }
        }
    });
}, {
    rootMargin: '0px 0px 200px 0px'
});

async function appendGalleryItem(item, isHighlightItem = false) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('gallery-item');
    if (isHighlightItem) {
        wrapper.classList.add('gallery-highlight');
    }

    wrapper.innerHTML = `<div class="gallery-description" style="cursor:pointer;">${item.htmlContent}</div>`;

    galleryContainer.append(wrapper);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.htmlContent;

    let linkUrl = null;
    const aTag = tempDiv.querySelector('a[href]');
    if (aTag) {
        linkUrl = aTag.href;
    }

    if (linkUrl) {
        wrapper.querySelector('.gallery-description').addEventListener('click', () => {
            window.open(linkUrl, '_blank', 'noopener');
        });
    }
}

async function fetchAndAppendItems(startIdx, count, basePath, isHighlight = false) {
    isLoading = true;
    let itemsToLoad = [];
    const actualEndIdx = Math.max(1, startIdx - count + 1);

    for (let i = startIdx; i >= actualEndIdx; i--) {
        if (i < 1) break;

        const htmlPath = `${basePath}/${i}.html`;

        try {
            const htmlResponse = await fetch(htmlPath);
            if (!htmlResponse.ok) {
                break;
            }

            const htmlContent = await htmlResponse.text();
            itemsToLoad.push({ htmlContent, index: i });
        } catch (e) {
            break;
        }
    }

    itemsToLoad.reverse();
    for (const item of itemsToLoad) {
        await appendGalleryItem(item, isHighlight);
        currentLoadedCount++;
    }
    isLoading = false;

    if (isHighlight && currentLoadedCount >= startIdx) {
        highlightItemsLoaded = true;
        currentLoadedCount = 0;
    }
}

async function findLastExistingEntry(basePath) {
    let lastFoundBatch = 0;
    let firstMissingBatch = MAX_GALLERY_INDEX + BATCH_SEARCH_STEP;

    for (let i = BATCH_SEARCH_STEP; i <= MAX_GALLERY_INDEX; i += BATCH_SEARCH_STEP) {
        const htmlPath = `${basePath}/${i}.html`;
        try {
            const response = await fetch(htmlPath, { method: 'HEAD' });
            if (response.ok) {
                lastFoundBatch = i;
            } else {
                firstMissingBatch = i;
                break;
            }
        } catch (e) {
            firstMissingBatch = i;
            break;
        }
    }

    let low = Math.max(1, lastFoundBatch + 1);
    let high = Math.min(MAX_GALLERY_INDEX, firstMissingBatch - 1);

    if (lastFoundBatch === 0) {
        low = 1;
        high = Math.min(MAX_GALLERY_INDEX, firstMissingBatch - 1);
    } else if (lastFoundBatch === MAX_GALLERY_INDEX) {
        return MAX_GALLERY_INDEX;
    }

    let finalLastFound = lastFoundBatch;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const htmlPath = `${basePath}/${mid}.html`;
        try {
            const response = await fetch(htmlPath, { method: 'HEAD' });
            if (response.ok) {
                finalLastFound = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        } catch (e) {
            high = mid - 1;
        }
    }

    return finalLastFound;
}

async function loadMoreHighlightItems() {
    if (isLoading || highlightItemsLoaded) {
        return;
    }

    isLoading = true;

    const startIdx = lastFoundHighlightEntry - currentLoadedCount;
    await fetchAndAppendItems(startIdx, LOAD_MORE_COUNT, 'html/gallery/highlight', true);

    isLoading = false;

    updateLoadingSentinel();
}

async function loadMoreGalleryItems() {
    if (isLoading || currentLoadedCount >= lastFoundGalleryEntry) {
        if (currentLoadedCount >= lastFoundGalleryEntry && loadingSentinel) {
            observer.unobserve(loadingSentinel);
            loadingSentinel.remove();
            loadingSentinel = null;
        }
        return;
    }

    isLoading = true;

    const startIdx = lastFoundGalleryEntry - currentLoadedCount;
    await fetchAndAppendItems(startIdx, LOAD_MORE_COUNT, 'html/gallery');

    isLoading = false;

    updateLoadingSentinel();
}

function updateLoadingSentinel() {
    if (loadingSentinel) {
        observer.unobserve(loadingSentinel);
        loadingSentinel.remove();
        loadingSentinel = null;
    }

    if ((!highlightItemsLoaded && currentLoadedCount < lastFoundHighlightEntry) ||
        (highlightItemsLoaded && currentLoadedCount < lastFoundGalleryEntry)) {
        loadingSentinel = document.createElement('div');
        loadingSentinel.id = 'loading-sentinel';
        loadingSentinel.style.height = '1px';
        loadingSentinel.style.width = '100%';

        galleryContainer.append(loadingSentinel);
        observer.observe(loadingSentinel);
    }
}

(async () => {
    lastFoundHighlightEntry = await findLastExistingEntry('html/gallery/highlight');
    lastFoundGalleryEntry = await findLastExistingEntry('html/gallery');

    if (lastFoundHighlightEntry === 0 && lastFoundGalleryEntry === 0) {
        galleryLoadingElements.forEach(element => element.remove());
        return;
    }

    if (lastFoundHighlightEntry > 0) {
        await fetchAndAppendItems(lastFoundHighlightEntry, INITIAL_LOAD_COUNT, 'html/gallery/highlight', true);
    } else {
        highlightItemsLoaded = true;
        currentLoadedCount = 0;
    }

    if (highlightItemsLoaded && lastFoundGalleryEntry > 0 && currentLoadedCount === 0) {
        await fetchAndAppendItems(lastFoundGalleryEntry, INITIAL_LOAD_COUNT, 'html/gallery');
    }

    updateLoadingSentinel();

    galleryLoadingElements.forEach(element => element.remove());
})();