//global variable to track updates made to kanban
var phaseUpdates = {};

//allows requests table to be sortable by column headers
$(function(){
    $('#request-table').tablesorter(); 
});

//replace normal text areas with wysiwyg editor
/*$(function(){ 
    $('textarea').froalaEditor({
        quickInsertButtons: [],
        toolbarButtons: ['bold', 'italic', 'underline', 
        'subscript', 'superscript', '|', 'fontFamily', 'fontSize', 'color', 'inlineStyle', 
        'paragraphStyle', '|', 'paragraphFormat', 'align', 'formatOL', 'formatUL', 'outdent', 
        'indent', 'quote', 'spellChecker', 'help', '|', 'undo', 'redo']
    });
});*/

//following three functions override default drag and drop functionality
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev, el) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    el.appendChild(document.getElementById(data));
    phaseUpdates[data] = el.id;
}

//send list of kanban updates to backend api
function submitKanban() {
    var formData = new FormData();
    for(name in phaseUpdates) {
        formData.append(name, phaseUpdates[name]);
    }
    fetch('/intakes/kanban/submit', {
        method: 'POST',
        body: formData
    }).then(function(response) {
        if(response.ok) {
            //clear the updates
            phaseUpdates = {};
            window.location.href='/intakes/kanban'
            return response.blob();
        }
        throw new Error('Network response was not ok. Please try again');
    }).catch(function(error) {
        console.log('There has been a problem with your fetch operation: ', error.message);
    })
}

//deleting intake
$(document).ready(function() {
    $('.delete-intake').on('click', function(e) {
        $target = $(e.target);
        const id = $target.attr('data-id');
        $.ajax({
            type: 'DELETE',
            url: '/intakes/'+id,
            success: function(res){
                window.location.href='/intakes';
            },
            error: function(err){
                console.log(err);
            }
        })
    });
});

//deleting user
$(document).ready(function() {
    $('.delete-user').on('click', function(e) {
        $target = $(e.target);
        const id = $target.attr('data-id');
        $.ajax({
            type: 'DELETE',
            url: '/users/'+id,
            success: function(res){
                window.location.href='/users';
            },
            error: function(err){
                console.log(err);
            }
        })
    });
});

