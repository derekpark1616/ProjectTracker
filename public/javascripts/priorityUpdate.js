//global variable to track updates made to kanban
var priorityUpdates = {};

//track which priorities were updated with an event listener
var editableArray = document.querySelectorAll('td.priority');
editableArray.forEach(function (editablePriority) {
    editablePriority.addEventListener('input', function() {
        console.log(this.parentElement.id);
        priorityUpdates[this.parentElement.id] = this.innerText;
    });
});

//send the updates to the backend
function submitPriorities() {
    var formData = new FormData();
    for(name in priorityUpdates) {
        formData.append(name, priorityUpdates[name]);
    }
    fetch('/intakes/priorityupdate', {
        method: 'POST',
        body: formData
    }).then(function(response) {
        if(response.ok) {
            //clear the updates
            priorityUpdates = {};
            window.location.href='/intakes'
            return response.blob();
        }         
        throw new Error('Network response was not ok. Please try again');
    }).catch(function(error) {
        console.log('There has been a problem with your fetch operation: ', error.message);
    })
}