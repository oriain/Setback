var channelName = "project-3";

$(document).ready(function () {
    return;

    /************ Pusher Code ************/
    // Open a connection to Pusher
    var pusher = new Pusher('8bf5a558afbb3d828d62');
    //Pusher.channel_auth_endpoint = '/Services/Setback.asmx/AuthUser';

    // Get the socketId
    pusher.connection.bind('connected', function () {
        socketId = pusher.connection.socket_id;
    });

    // Subscribe to a Channel
    var channel = pusher.subscribe(channelName);

    // Listen for events on your channel
    channel.bind('foo', function (data) {
        console.log('foo event was triggerred and recieved');
        console.log(data);
    });
    /*************************************/

    $('#triggerFoo').on('click', function () {
        var urlString = "http://api.pusherapp.com/apps/39028/events";
        var jsonData = '{"name":"foo","channels":["project-3"],"data":"{\"some\":\"data\"}"}';
        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: urlString,
            data: jsonData,
            dataType: "json",
            success: function () {
                console.log('ajax post successfully made.');
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (console.log) {
                    console.log(jqXHR);
                    console.log(textStatus);
                    console.log(errorThrown);
                    console.log('ajax post encountered an error.');
                }
            }
        });
    });

    return;

    // Open a connection to Pusher
    //var pusher = new Pusher('8bf5a558afbb3d828d62');
    //Pusher.channel_auth_endpoint = '/Services/Setback.asmx/AuthUser';

    var app_id = "39028";
    var auth_key = "8bf5a558afbb3d828d62";
    var auth_timestamp = $('#auth_timestamp').val();
    var auth_version = "1.0";
    var auth_signature = $('#auth_signature').val();
    var urlString = "http://api.pusherapp.com/apps/" + app_id + "/channels?auth_key=" + auth_key + "&auth_timestamp=" + auth_timestamp + "&auth_version=" + auth_version + "&auth_signature=" + auth_signature;

    $.get(urlString, function (data) {
        //$('.result').html(data);
        alert('Load was performed.');
    });

    $.get('http://api.pusherapp.com/apps/39028/channels', function (data) {
        //$('.result').html(data);
        alert('Load was performed.');
    });

    return;

    $.ajax({
        type: "GET",
        contentType: "application/json; charset=utf-8",
        //url: urlString//,
        url: "http://api.pusherapp.com/apps/39028/channels"
        //data: dataJson,
        //dataType: "json"//,
        //success: displayHand,
        //error: displayError
    });
});