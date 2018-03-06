var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var videoPlayer = document.querySelector('#player');
var canvasElement = document.querySelector('#canvas');
var captureButton = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var picture;
var locationBtn = document.querySelector('#location-btn');

function initializeMedia(){
  //api that gives us access to the media devices like mobile camera
  if(!'mediaDevices' in navigator){
    navigator.mediaDevices = {};
  }
  //polyfill fallback for getUserMedia
  if(!('getUserMedia' in navigator.mediaDevices)){
    navigator.mediaDevices.getUserMedia = function(constraints){
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if(!getUserMedia){
        return Promise.reject(new Error('getUserMedia is not implemented'));
      }
      return new Promise(function(resolve, reject){
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }

  navigator.mediaDevices.getUserMedia({video: true})
    .then(function(stream){
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(function(err){
      imagePickerArea.style.display = 'block';
    });
}

captureButton.addEventListener('click', function(event){
  canvasElement.style.display = 'block';
  videoPlayer.style.display = 'none';
  captureButton.style.display = 'none';
  var context = canvasElement.getContext('2d');
  context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / ( videoPlayer.videoWidth / canvas.width ));
  videoPlayer.srcObject.getVideoTracks().forEach(function(track){
    track.stop();
  })
  picture = dataURItoBlob(canvasElement.toDataURL());
});

imagePicker.addEventListener('change', function(event){
  picture = event.target.files[0]
})

function openCreatePostModal() {
  createPostArea.style.transform = 'translateY(0)';  
  initializeMedia();
  if(deferedPrompt){
    deferedPrompt.prompt();

    deferedPrompt.userChoice.then(function(choiceResult){
      console.log(choiceResult.outcome);
      if(choiceResult.outcome === 'dismissed'){
        console.log('user cancelled installation');
      }else{
        console.log('User added to home screen');
      }
    });
    deferedPrompt = null;
  }

  //unregistering the service worker
  /**
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations()
      .then(function(registrations){
        for(var i = 0; i < registrations.length; i++){
          registrations[i].unregister();
        }
      });
  }
  */
}

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display= 'none';
}

shareImageButton.addEventListener( 'click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

//
function onSaveButtonClicked(event){
  //if browser supports caches
  if('caches' in window){
    caches.open('user-requested')
    .then(function(cache){
      cache.add('https://httpbin.org/get');
      cache.add('/src/images/sf-boat.jpg');
    });
  }
}

function clearCards () {
  while(sharedMomentsArea.hasChildNodes()){
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}
function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  cardWrapper.style.margin = 'auto';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url(' + data.image + ')';
  cardTitle.style.backgroundSize = 'cover';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  //var cardSaveButton = document.createElement('button');
  //cardSaveButton.textContent = 'Save';
  //cardSaveButton.addEventListener('click', onSaveButtonClicked);
  //cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}


function updateUI(data){
  clearCards();
  for( var i = 0; i < data.length; i++ ){
    createCard(data[i]);
  }
}
//var url = 'https://httpbin.org/get';
var url = 'https://postagram-40ca9.firebaseio.com/posts.json';
var networkDataReceived = false;

fetch( url )
  .then(function(res) {
    return res.json();
  })
  .then(function(data) {
  //  console.log("Response received from servers", data);
    networkDataReceived = true;
    var dataArray = [];
    for(var key in data){
      dataArray.push(data[key]);
    }
    updateUI(dataArray);
  });

if('indexedDB' in window){
  readAllData('posts')
    .then(function(data){
      if(!networkDataReceived){
        console.log("From indexedDB", data);
        updateUI(data);
      }
    });
}

function sendData(){
  var id = new Date().toISOString();
  var postData = new FormData();
  postData.append('id', id);
  postData.append('title', titleInput.value);
  postData.append('location', locationInput.value);
  postData.append('file', picture, id+'.png');
  fetch('https://us-central1-postagram-40ca9.cloudfunctions.net/storePostData', {
    method: 'POST',
    body: postData
  })
    .then(function(res){
      console.log('Send data', res);
      updateUI();
    });
}

form.addEventListener('submit', function(event){
  event.preventDefault();
  if(titleInput.value.trim() === '' || locationInput.value.trim() === ''){
    alert('Please enter valid data!');
    return;
  }
  closeCreatePostModal();

  if('serviceWorker' in navigator && 'SyncManager' in window){
    //ready property tells if service worker is 
    //ready -> installed and activated
    navigator.serviceWorker.ready
      .then(function(sw){
        var post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value,
          picture:  picture
        };
        writeData('sync-posts', post)
          .then(function(){
            //allows us to register a syncronization
            // task with the service worker
            return sw.sync.register('sync-new-posts');
          })
          .then(function(){
            var snackbarContainer = document.querySelector('#confirmation-toast');
            var data = {message: 'Your post was saved for syncing'};
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
          })
          .catch(function(err){
            console.log(err);
          });
      });
  }else{
    sendData();
  }
});