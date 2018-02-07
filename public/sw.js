var CACHE_STATIC_NAME = 'static-v3';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/app.js',
    '/src/js/feed.js',
    '/src/js/promise.js',//adding them only for performance
    '/src/js/fetch.js',//adding them only for performance
    '/src/js/material.min.js',
    '/src/css/app.css',
    '/src/css/feed.css',
    '/src/images/main-image.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];
/**
 * we dont have access to DOM in the 
 * service workers, we dont have access to normal DOM e vents such as
 * click, but a special set of events, eg. install
 */
self.addEventListener('install', function(event){
    console.log('[Service Worker] Installing service worker...', event);
    /**
     * pre-caching at the installation of service worker
     * caching stuff that wont change much, eg. the css 
     *
     * Dev tools -> Application -> Cache Storage
     * 
     * This is asyncronous code in the service worker, because it is 
     * running in the backgroud and is event driven, therefore the install event 
     * does not wait for the caches.oprn() to finish by default. This may lead to issues
     * as the service worker might finish its installation and we might have a fetch request
     * and we try to get it from the cache even though the caches.open has not completed yet.
     * 
     * Therefore, event.waitUntil, this will wait untill caches.open which returns a promise doesnot finish,
     * it wait make the installation event wait.
     */
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(function(cache){
                /**
                 * add files through the cache
                 */
                console.log('[Service Worker] Precaching app shell');
                cache.addAll(STATIC_FILES);
            })
    );
});

/**
 * When we run out application, we see the Service Worker registered log from app.js,
 * we see the installing log from our above mentioned event listener, but we dont see the 
 * log in our activating log.
 * 
 * Go to Application in google dev tools, we wil see there that the 
 * service worker was received but was not activated yet
 * 
 * Reason -> If we have any tab opened on the browser, then new service workers will get 
 * installed but not activated, because the page may still be communicating with the old service worker,
 * activating new one might have some breaking changes
 * 
 * If we make changes to the service worker then we need to close all the tabs to activate the
 * new version for the service worker to activate
 */
self.addEventListener('activate', function(event){
    console.log('[Service Worker] Activating service worker...', event);
    /**
     * cleaning up the cache here, used this event instead of install
     * because we dont wanna mess with the older version of caches,
     * moreover the activate event will only be started once the user has closed all the 
     * tabs, therefore it wont even mess with the working of the application
     * 
     */
    event.waitUntil(
        caches.keys()
            .then(function(keyList){
                //takes an array of promises and waits for all of them to finish
                return Promise.all(keyList.map(function(key){
                    if(key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME){
                        console.log('[Service worker] Removing old cache', key);
                        return caches.delete(key);//returns a promise
                    }
                }));
            })
    );
    //it ensures that service workers have activated corrently
    return self.clients.claim();
});

function isInArray(string, array){
    var cachePath;
    if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
      console.log('matched ', string);
      cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
    } else {
      cachePath = string; // store the full request (for CDNs)
    }
    return array.indexOf(cachePath) > -1;
}
/**
 * whenever our web app fetches something eg. css, image. not ajax
 */
self.addEventListener('fetch', function(event){
    var url = 'https://httpbin.org/get';
    /**
     * implementing the cache then network stratergy for URL 
     * The stratergy checks if the request is made of the said url
     * and then puts the response in the cache, inside feed.js we have called
     * the fetch request to display data simultaneously while checking for the 
     * same data in cache, whichever is faster in fetching the data, displays the 
     * data on the screen, if the fetch request responds first then this listener 
     * makes sure that the data fetched is caches accordingly in the dynamic cache
     * 
     * If the request is not on the server then the other cache then network stratergy is
     * used wherein we first check the cache before sending the fetch request.
     * 
     * 
     */
    if(event.request.url.indexOf(url) > -1){
        /**
         * We are not checking the cache here before sending the fetch request
         * because if we were to find the data corresponding to the request in the cache
         * then we might override the new data from the servers with the old data of the 
         * cache, hence we have modified the flow to fetch from servers and look into the cache for the
         * server data simultaneouly, making necessary updations into the dynamic cache in case of the
         * fetching from servers. 
         */
        event.respondWith(
            caches.open(CACHE_DYNAMIC_NAME)
            .then(function(cache){
                return fetch(event.request)
                    .then(function (res){
                        cache.put(event.request, res.clone());
                        return res;
                    });
            })
        );
    //}else if (new RegExp('\\b' + STATIC_FILES.join('\\b|\\b') + '\\b').test(event.request.url)) {
    }else if(isInArray(event.request.url, STATIC_FILES)){
        /**
         * checking if the fetch request is made for any
         * of the pre cached files (cached in the installation step),
         * in case it is, using the cache only
         * stratergy to avoid any network call and
         * simply returning from the cache itself
         */
        event.respondWith(
            caches.match(event.request)
        );
    }else{
        event.respondWith(
            caches.match(event.request)
                .then(function(response){
                    if(response){
                        return response;
                    }else{
                        return fetch(event.request)
                            .then(function(res){
                                return caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function(cache){
                                        /**
                                         * note: the response if we store it, it is consumed,
                                         * meaning, it is empty, this is how responses work,
                                         * we can only use them, or consome them once, storing them in the cache
                                         * uses the response, therefore cloning and saving the response
                                         */
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    })
                            })
                            .catch(function(err){
                                //returning the fallback page
                                return caches.open(CACHE_STATIC_NAME)
                                    .then(function(cache){
                                        if(event.request.headers.get('accept').includes('text/html')){
                                            return cache.match('/offline.html');
                                        }
                                    });
                        });
                    }
                })
        );
    }
});
