var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');

function openCreatePostModal() {
  createPostArea.style.display = 'block';
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
}

function closeCreatePostModal() {
  createPostArea.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);
