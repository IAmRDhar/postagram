var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

function openCreatePostModal() {
  createPostArea.style.transform = 'translateY(0)';  
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
}

shareImageButton.addEventListener('click', openCreatePostModal);

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
  fetch('https://us-central1-postagram-40ca9.cloudfunctions.net/storePostData', {
    method: 'POST',
    headers:  {
      'Content-Type': 'application/json',
      'Accept': 'aaplication/json',
    },
    body: JSON.stringify({
      id: new Date().toISOString(),
      title:  titleInput.value,
      location: locationInput.value,
      image:  'https://firebasestorage.googleapis.com/v0/b/postagram-40ca9.appspot.com/o/sf-boat.jpg?alt=media&token=171f827f-20ca-4219-b3f5-837c719e7dd0'
    })
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
          location: locationInput.value
        };
        writeData('sync-posts', post)
          .then(function(){
            //allows us to register a syncronization
            // task with the service worker
            return sw.sync.register('sync-new-posts');
          })
          .then(function(){
            var snackbarContainer = document.querySelector('confirmation-toast');
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