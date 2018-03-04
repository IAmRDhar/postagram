
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v7';
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
    '/src/js/idb.js',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

/**
 * setting cache size and trimming it if it exceeds
function trimCache(cacheName, maxItems){
    caches.open(cacheName)
        .then(function(cache){
            return cache.keys()
            .then(function(keys){
                if(keys.length > maxItems){
                    cache.delete(keys[0])
                        .then(trimCache(cacheName, maxItems));
                }
            });
        })
}
*/

/**
 * we dont have access to DOM in the 
 * service workers, we dont have access to normal DOM e vents such as
 * click, but a special set of events, eg. install
 */
self.addEventListener('install', function(event){
    //console.log('[Service Worker] Installing service worker...', event);
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
                //console.log('[Service Worker] Precaching app shell');
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
    //console.log('[Service Worker] Activating service worker...', event);
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
                        //console.log('[Service worker] Removing old cache', key);
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
      //console.log('matched ', string);
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
    //var url = 'https://httpbin.org/get';
    var url = 'https://postagram-40ca9.firebaseio.com/posts.json';
    
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
            fetch(event.request)
                .then(function (res){
                var clonedRes = res.clone();
                clearAllData('posts')
                    .then(function(){
                        return clonedRes.json()
                    })
                    .then(function(data){
                        for(var key in data){
                            writeData('posts', data[key]);
                        }
                    });
                return res;
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
                                        //trimCache(CACHE_DYNAMIC_NAME, 5);
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    })
                            })
                            .catch(function(err){
                                //returning the fallback page
                                return caches.open(CACHE_STATIC_NAME)
                                    .then(function(cache){
                                        /**
                                         * checking if the request is for html page
                                         * this means that the incoming request accepts html as a response
                                         */
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

//whenever service worker believed it re-established conectivity
//or if connectivity was always there as soon as a new sync task was registered
self.addEventListener('sync', function(event){
    //in this block we know we have internet connection
    //and we want to send our data to the server
    console.log('[Service Worker] Background syncing', event);
    if(event.tag === 'sync-new-posts'){
        console.log('[Service Worker] Syncing new post');
        //event does not finish preamtively and waits for sending data
        event.waitUntil(
            readAllData('sync-posts')
                .then(function(data){
                    for(var dt of data){
                        fetch('https://us-central1-postagram-40ca9.cloudfunctions.net/storePostData', {
                            method: 'POST',
                            headers:  {
                              'Content-Type': 'application/json',
                              'Accept': 'aaplication/json',
                            },
                            body: JSON.stringify({
                              id: dt.id,
                              title:  dt.title,
                              location: dt.location,
                              image:  'https://firebasestorage.googleapis.com/v0/b/postagram-40ca9.appspot.com/o/sf-boat.jpg?alt=media&token=171f827f-20ca-4219-b3f5-837c719e7dd0'
                            })
                          })
                            .then(function(res){
                              console.log('Send data', res);
                              //not updating ui here cause we dont have acces to the dom
                              if(res.ok){
                                res.json()
                                    .then(function(resData){
                                        deleteItemFromData('sync-posts', resData.id); 
                                    })
                              }
                            })
                            .catch(function(err){
                                console.log('Error while sending data', err);
                            });
                    }
                    
                })
        );
    }
})

//whenever user clicks on the notification thrown by this service worker
self.addEventListener('notificationclick', function(event){
    //which notification
    var notification = event.notification;
    //which action
    var action = event.action;

    console.log("[Service Worker] Notification" + notification);
    if(action === 'confirm' ){
        console.log('confirm was chosen');
        //getting rid of the notification
        notification.close();
    }else{
        console.log(action);
        event.waitUntil(
            clients.matchAll()
                .then(function(clis){
                    var client = clis.find(function(c){
                        return c.visibilityState === 'visible'
                    });

                    //we found an open window with our app
                    if(client !== undefined){
                        client.navigate(notification.data.url);
                        client.focus();
                    }else{
                        clients.openWindow(notification.data.url);
                    }
                    notification.close();
                })
        );
    }
});


//swiped the notification | closedall notification | clicked the X
//if we dont interact with it, just close it
self.addEventListener('notificationclose', function(event){
    console.log('Notification was closed', action);
});

/**
 * When do we get a push message?
 * when this service worker on this browser on this device
 * has a subscription to which this push message was sent
 * each subscription stored under server has an end point
 * and therefore if we send a push message from our server
 * to that subscription this sw who created the subscription
 * will receive it.
 */
self.addEventListener('push', function(event){
    console.log('Push notification received', event);
    var data = {title: 'New', content: 'Something new happened!', openUrl: '/help'};
    if(event.data){
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.content,
        icon: '/src/images/icons/app-icon-96x96.png',
        badge: '/src/images/icons/app-icon-96x96.png',
        data:   {
            url:    data.openUrl
        }
    };

    //to make sure sw waits to show this notification
    event.waitUntil(
        //active sw cant show notification, it is there to listen to events
        //running in the background, therefore we need to get access to the 
        //regiteration of this sw, that is the part running in the browser
        // that is the part that connects the sw with the browser
        self.registration.showNotification(data.title, options)
    );
});