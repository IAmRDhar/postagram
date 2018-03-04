const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
const webpush = require('web-push');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./postagram-fb-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:    'https://postagram-40ca9.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest(function (request, response) {
  //response.send("Hello from Firebase!");
    cors(request, response, function(){
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        })
            .then(function(){
                webpush.setVapidDetails('mailto:rahul.dhar47@gmail.com',
                 'BHDEl1vksTI00WnFi8_On_oUu-CuR871SUEVdyXYI_YYafP0dywjH_oyNqwSpQ8T5wDpuxtry6OUmwV98OVjUV0',
                 'c4RvNYYeIDo-9tU5cZ7UkFyoPRJLQ404GyHsENAmtKo');
                return admin.database().ref('subscriptions').once('value');
            })
            .then(function(subscriptions){
                subscriptions.forEach(function(sub) {
                    var pushConfig = {
                        endpoint: sub.val().endpoint,
                        keys: {
                            auth: sub.val().keys.auth,
                            p256dh: sub.val().keys.p256dh
                        }
                    };
                    webpush.sendNotification(pushConfig, JSON.stringify({
                        title: 'New Post',
                        content: 'A new post has been added by a subscriber',
                        openUrl:    '/'  
                    }))
                    .catch(function(err){
                        console.log(err);
                    });
                });
                response.status(201).json({message: 'Data Stored', id: request.body.id});
                return true;
            })
            .catch(function(err){
                request.status(500).json({error: err});
                return true;
            });
    });
});
