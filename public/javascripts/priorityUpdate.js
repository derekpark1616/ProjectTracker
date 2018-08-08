//global variable to track updates made to kanban
var trackerUpdates = {};

//track changes to priority, developer, qa with event listeners
var priorityArray = document.querySelectorAll('td.priority');
var developerArray = document.querySelectorAll('td.developer');
var qaArray = document.querySelectorAll('td.qa');
priorityArray.forEach(function (editablePriority) {
    editablePriority.addEventListener('input', function() {
        console.log(this.parentElement.id);
        //prepend the type of update this is (pr)
        trackerUpdates['pr'+this.parentElement.id] = this.innerText;
    });
});
developerArray.forEach(function (dev) {
    dev.addEventListener('input', function() {
        console.log(this.parentElement.id);
        //prepend the type of update this is (de)
        trackerUpdates['de'+this.parentElement.id] = this.innerText;
    });
});
qaArray.forEach(function (qa) {
    qa.addEventListener('input', function() {
        console.log(this.parentElement.id);
        //prepend the type of update this is (qa)
        trackerUpdates['qa'+this.parentElement.id] = this.innerText;
    });
});

//send the updates to the backend
function submitPriorities() {
    var formData = new FormData();
    for(name in trackerUpdates) {
        formData.append(name, trackerUpdates[name]);
    }
    fetch('/intakes/priorityupdate', {
        method: 'POST',
        body: formData
    }).then(function(response) {
        if(response.ok) {
            //clear the updates
            trackerUpdates = {};
            window.location.href='/intakes'
            return response.blob();
        }         
        throw new Error('Network response was not ok. Please try again');
    }).catch(function(error) {
        console.log('There has been a problem with your fetch operation: ', error.message);
    })
}