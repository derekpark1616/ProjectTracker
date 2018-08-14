var toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons

    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent

    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown

    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],
];

var descriptionQuill = new Quill('#descriptionQuill', {
    modules: {
        toolbar: toolbarOptions
    },
    theme: 'snow'
});

var justificationQuill = new Quill('#justificationQuill', {
    modules: {
        toolbar: toolbarOptions
    },
    theme: 'snow'
});

//hacky stuff to store the html of the wysiwig in database
var form = document.querySelector('#editForm');
form.onsubmit = function () {
    // Populate hidden form on submit
    var description = document.querySelector('input[name=description]');
    var justification = document.querySelector('input[name=justification]');
    var descriptionEditor = document.querySelector('#descriptionQuill');
    var justificationEditor = document.querySelector('#justificationQuill');
    var dhtml = descriptionEditor.children[0].innerHTML;
    var jhtml = justificationEditor.children[0].innerHTML;
    description.value = dhtml;
    justification.value = jhtml;

    console.log("Submitted", $(form).serialize(), $(form).serializeArray());
};

//disable setting target date to a passed date
$(document).ready(function() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    if(dd<10) {
        dd='0'+dd;
    }
    if(mm<10) {
        mm='0'+mm;
    }
    today = yyyy+'-'+mm+'-'+dd;
    document.getElementById('targetDate').setAttribute('min', today);
});