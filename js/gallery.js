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

    wrapper.innerHTML = `
        <img class="gallery-img" src="${item.imgPath}" alt="Artwork ${item.index}" style="cursor:pointer;" />
        <div class="gallery-description" style="cursor:pointer;">${item.htmlContent}</div>
    `;

    galleryContainer.append(wrapper);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.htmlContent;

    let linkUrl = null;
    const aTag = tempDiv.querySelector('a[href]');
    if (aTag) {
        linkUrl = aTag.href;
    } else {
        const dataLink = tempDiv.querySelector('[data-link]');
        if (dataLink) {
            linkUrl = dataLink.getAttribute('data-link');
        }
    }

    if (linkUrl) {
        wrapper.querySelector('.gallery-img').addEventListener('click', () => {
            window.open(linkUrl, '_blank', 'noopener');
        });
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
        const imgPath = `${basePath}/${i}.png`;

        try {
            const htmlResponse = await fetch(htmlPath);
            if (!htmlResponse.ok) {
                break;
            }

            const htmlContent = await htmlResponse.text();
            itemsToLoad.push({ htmlContent, imgPath, index: i });
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
    let tempLastEntry = 0;

    for (let i = BATCH_SEARCH_STEP; i <= MAX_GALLERY_INDEX; i += BATCH_SEARCH_STEP) {
        const htmlPath = `${basePath}/${i}.html`;
        try {
            const response = await fetch(htmlPath, { method: 'HEAD' });
            if (response.ok) {
                tempLastEntry = i;
            } else {
                break;
            }
        } catch (e) {
            break;
        }
    }

    let searchStart = tempLastEntry === 0 ? BATCH_SEARCH_STEP - 1 : tempLastEntry;
    searchStart = Math.min(searchStart, MAX_GALLERY_INDEX);

    let searchEnd = tempLastEntry === 0 ? 1 : tempLastEntry - BATCH_SEARCH_STEP + 1;
    searchEnd = Math.max(1, searchEnd);

    for (let i = searchStart; i >= searchEnd; i--) {
        const htmlPath = `${basePath}/${i}.html`;
        try {
            const response = await fetch(htmlPath, { method: 'HEAD' });
            if (response.ok) {
                return i;
            }
        } catch (e) {
        }
    }

    return tempLastEntry;
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