/**
 * checking if the browser has support for Promises,
 * if not then instantiating the Promise using 
 * promise.js
 * 
 * LEGACY BROWSER SUPPORT FOR PROMISE
 */
if(!window.Promise){
    /**
     * activates or enables Promise polyfill, doinf os for legacy browsers
     * that don't support Promises
     */
    window.Promise = Promise;
}
/**
 * navigator is the browser
 * checking if the service worker property 
 * exists in the browser
 * (checking if browser supports service workers)
 * 
 * Service Workers only work on https
 */
if('serviceWorker' in navigator){ 
    /**
     * registering the service worker
     * register returns a Promise
     * register function takes a seconf argument
     * which is a json object, where we can pass the scope property
     * and can restrict the scope, eg. {scope: '/help/'}
     */ 
    navigator.serviceWorker
        .register('/sw.js')
        .then(function(){
            console.log('Service worker registered');
        });
}

var deferedPrompt
//triggered by chrome right before it is about to show the install banner 
window.addEventListener('beforeinstallprompt', function(event){
    console.log("beforeinstallprompt fired");
    event.preventDefault();
    deferedPrompt = event;
    return false;
})