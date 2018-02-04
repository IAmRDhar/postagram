
/**
 * we dont have access to DOM in the 
 * service workers, we dont have access to normal DOM e vents such as
 * click, but a special set of events, eg. install
 */
self.addEventListener('install', function(event){
    console.log('[Service Worker] Installing service worker...', event);
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
    //it ensures that service workers have activated corrently
    return self.clients.claim();
});

/**
 * whenever our web app fetches something eg. css, image. not ajax
 */
self.addEventListener('fetch', function(event){
    console.log('[Service Worker] Fetching something...', event);
    //lets us override the data that gets sent back
    event.respondWith(fetch(event.request));
});