const galleryContainer = document.getElementById('gallery-container');
const galleryLoadingElements = document.querySelectorAll('.gallery-loading');
const INITIAL_LOAD_COUNT = 4;
const LOAD_MORE_COUNT = 1;
const MAX_GALLERY_INDEX = 1000; 
const BATCH_SEARCH_STEP = 10;

let lastFoundEntry = 0;
let currentLoadedCount = 0;
let isLoading = false;
let loadingSentinel = null;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading && (lastFoundEntry - currentLoadedCount > 0)) {
            loadMoreGalleryItems();
        }
    });
}, {
    rootMargin: '0px 0px 200px 0px'
});

async function appendGalleryItem(item) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('gallery-item');

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

async function fetchAndAppendItems(startIdx, count) {
    isLoading = true;
    let itemsToLoad = [];
    const actualEndIdx = Math.max(1, startIdx - count + 1);

    for (let i = startIdx; i >= actualEndIdx; i--) {
        if (i < 1) break;

        const htmlPath = `html/gallery/${i}.html`;
        const imgPath = `html/gallery/${i}.png`;

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
        await appendGalleryItem(item);
        currentLoadedCount++;
    }
    isLoading = false;
}

async function findLastExistingEntry() {
    let tempLastEntry = 0;

    for (let i = BATCH_SEARCH_STEP; i <= MAX_GALLERY_INDEX; i += BATCH_SEARCH_STEP) {
        const htmlPath = `html/gallery/${i}.html`;
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
        const htmlPath = `html/gallery/${i}.html`;
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

async function loadMoreGalleryItems() {
    if (isLoading || currentLoadedCount >= lastFoundEntry) {
        if (currentLoadedCount >= lastFoundEntry && loadingSentinel) {
            observer.unobserve(loadingSentinel);
            loadingSentinel.remove();
            loadingSentinel = null;
        }
        return;
    }

    isLoading = true;

    const startIdx = lastFoundEntry - currentLoadedCount;
    await fetchAndAppendItems(startIdx, LOAD_MORE_COUNT);

    isLoading = false;

    updateLoadingSentinel();
}

function updateLoadingSentinel() {
    if (loadingSentinel) {
        observer.unobserve(loadingSentinel);
        loadingSentinel.remove();
    }

    if (currentLoadedCount >= lastFoundEntry) {
        return;
    }

    loadingSentinel = document.createElement('div');
    loadingSentinel.id = 'loading-sentinel';
    loadingSentinel.style.height = '1px';
    loadingSentinel.style.width = '100%';
    
    galleryContainer.append(loadingSentinel);
    observer.observe(loadingSentinel);
}

(async () => {
    lastFoundEntry = await findLastExistingEntry();

    if (lastFoundEntry === 0) {
        galleryLoadingElements.forEach(element => element.remove());
        return;
    }

    await fetchAndAppendItems(lastFoundEntry, INITIAL_LOAD_COUNT);

    updateLoadingSentinel();

    galleryLoadingElements.forEach(element => element.remove());
})();
