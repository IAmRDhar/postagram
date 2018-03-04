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

var enableNotificationButtons = document.querySelectorAll('.enable-notifications');

function displayConfirmNotification(){
    /**
     * the function for the action should be in the service worker
     * as the notification is a system feature, it's not displayed in the web app,
     * it's not html, it is displayed by the operating system, hence the user may
     * interact with it when the page is not even open, this is what service workers
     * are about.
     */
    if('serviceWorker' in navigator){
        var options = { //device property, not browser's
            body: 'You successfully subscribed to our Notification service',
            icon:   '/src/images/icons/app-icon-96x96.png',
            image:  '/src/images/sf-boat.jpg',
            dir:    'ltr',
            lang:   'en-US', //BCP-47
            vibrate:    [100,50,200],   //vibration pause vibration pause
            badge:  '/src/images/icons/app-icon-96x96.png',
            tag:    'confirm-notification', //notifications with same tag will stack together, instead of different notifications
            renotify:   true, //even if we used the same tag, new notification will still vibrate and alert the user, if false then won't vibrate
            actions:    [   //buttons displayes next to notification
                {//should never be core feature, actions might not be displayes
                    action: 'confirm',  //id
                    title: 'Okay',
                    icon:   '/src/images/icons/app-icon-96x96.png'
                },
                {
                    action: 'cancel',
                    title: 'Cancel',
                    icon:   '/src/images/icons/app-icon-96x96.png'
                }
            ]
        };
    
        navigator.serviceWorker.ready
            .then(function(swreg){
                swreg.showNotification('Successfully subscribed', options);
            })
    }
    //new Notification('Successfully subscribed', options);
}

function configurePushSub(){
    //no support for SW in browser
    if(!('serviceWorker' in navigator)){
        //bail
        return;
    }

    var reg;
    /**
     * getting access to service worker, because even though we execute it here,
     * the frontend, the main js code because we do it as a reaction to a DOM event,
     * subscriptions are managed by the service worker
     * 
     * service workers are responsible for reacting to our push messages
     *  
     */
    navigator.serviceWorker.ready
        .then(function(swreg){
            reg = swreg;
            return swreg.pushManager.getSubscription(); //a method that shall return any existing subs (returns a promise)
        })
        .then(function(sub){
            //each browser-device combo is a new subscription
            if( sub === null ){
                //create new sub
                var vapidPublicKey = 'BHDEl1vksTI00WnFi8_On_oUu-CuR871SUEVdyXYI_YYafP0dywjH_oyNqwSpQ8T5wDpuxtry6OUmwV98OVjUV0';
                //we dont pass this key to the sub method, the sub object actually expects a Uint8 Array
                var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
                console.log("Vapid Public key", convertedVapidPublicKey);
                return reg.pushManager.subscribe({
                    /**
                     * we identify our own backend server as the only validsource sending
                     * you push messages, so that anyone else sending push messages to that API
                     * endpoint by the browser vendor server will simply not get through, his push messages wont be delivered
                     * 
                     * to identify our backend server, passing just the ip is not enough
                     * 
                     * We use an approach called VAPID (public and private keys)
                     */
                    userVisibleOnly: true, //push notification sent by us are only visible to this user
                    applicationServerKey: convertedVapidPublicKey,
                }); //creates a new subfor the browser on the device, if we have an existing sub, it will render the old one useless
            } else{
                //we have a new sub
            }
        })
        .then(function(newSub){
            console.log("NewSub", newSub);
            //newSub (new subscription) is what i want to pass my backend server
            return fetch('https://postagram-40ca9.firebaseio.com/subscriptions.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(newSub)
            })
        })
        .then(function(res){
            if(res.ok){
                displayConfirmNotification();                
            }
        })
        .catch(function(err){
            console.log(err);
        });
}

function askForNotificationPermission(){
    Notification.requestPermission(function(result){
        console.log('User choice', result);
        if(result !== 'granted'){
            console.log('No notification permission granted');
        } else{
            //hide button or change text
            configurePushSub();
            //displayConfirmNotification();
        }
    }); //implicitly gets push permission
}

//browser support for Notification API and SW
if('Notification' in window && 'serviceWorker' in navigator){
    for( var i = 0; i< enableNotificationButtons.length; i++){
        enableNotificationButtons[i].style.display = 'inline-block';
        enableNotificationButtons[i].addEventListener('click', askForNotificationPermission);
    }
}

