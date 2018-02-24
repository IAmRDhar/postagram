const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
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
                response.status(201).json({message: 'Data Stored', id: request.body.id});
                return true;
            })
            .catch(function(err){
                request.status(500).json({error: err});
                return true;
            });
    });
});
