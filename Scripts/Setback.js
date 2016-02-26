var gameId;
var channelPrefix = "presence-";
channelPrefix = "";
var channelName;
var me;
var userId;
var userInfo;
var playerNumber;

var fullDuration = 700;
var halfDuration = fullDuration / 1.5;
var rotationAngle = 15;

// Track the socket id
var socketId = null;

var myOpenTip;

var suits = {
    'D': 'diamonds',
    'S': 'spades',
    'H': 'hearts',
    'C': 'clubs'
};

var faces = {
    'A': 'ace',
    'K': 'king',
    'Q': 'queen',
    'J': 'jack'
};

var droppableHoverClass = "ui-state-hover";
var droppableActiveClass = "ui-state-active";
function droppableDrop(event, ui) { PlayCard(ui.draggable); }
var droppableOptions = {
    activeClass: droppableActiveClass,
    hoverClass: droppableHoverClass,
    drop: droppableDrop
};

$(document).ready(function () {
    // Am I really doing another JavaScript game?  I really need to get learn MVC...
    gameId = $("#GameId").val();
    channelName = channelPrefix + gameId;
    playerNumber = getUrlVars()["Player"];
    //$(".PlayerId").each(loadHand);
    displayDeck();

    droppableOptions.accept = "#Player1 img";
    $("#Card1").droppable(droppableOptions);
    droppableOptions.accept = "#Player2 img";
    $("#Card2").droppable(droppableOptions);
    droppableOptions.accept = "#Player3 img";
    $("#Card3").droppable(droppableOptions);
    droppableOptions.accept = "#Player4 img";
    $("#Card4").droppable(droppableOptions);

    // Cards may not be played until the bids have been made
    $("div.Cards").filter(function (index) {
        var id = $(this).parent().attr('id');
        return (id != 'Discard' && id != 'Deck');
    }).each(function (index, element) {
        $("img", element).each(function (index, element) {
            var card = $(this);
            card.css('left', index * 18);
            card.data('position', card.position());
        });
    });

    //if (currentBidder != '') $("#" + currentBidder + " .BiddingControls").show("slow");
    if (currentBidder != '') displayBidControls(currentBidder);

    /*????? Am I going to initialize with JS or on page load???????  ****/
    /***** Any code that is needed for initializing the game should be temporarily collected here. *****/

    // Update the names of the players


    /***************************************************************************************************/

    // Cards may not be played until the bids have been made
    //$(document).on("click", "#Player" + playerNumber + " img.PlayingCard", function () { PlayCard($(this)); });

    //var n = noty({
    //    text: 'Player 1 will start the game as dealer.'
    //    , type: 'information'
    //    , callback: {
    //        afterClose: function () {
    //            if (playerNumber == "2") $("#Player2 .BiddingControls").show("slow");
    //        }
    //    }
    //});

    //$.noty.defaults = {
    //	layout: 'top',
    //	theme: 'default',
    //	type: 'alert',
    //	text: '',
    //	dismissQueue: true, // If you want to use queue feature set this true
    //	template: '<div class="noty_message"><span class="noty_text"></span><div class="noty_close"></div></div>',
    //	animation: {
    //		open: {height: 'toggle'},
    //		close: {height: 'toggle'},
    //		easing: 'swing',
    //		speed: 500 // opening & closing animation speed
    //	},
    //	timeout: false, // delay for closing event. Set false for sticky notifications
    //	force: false, // adds notification to the beginning of queue when set to true
    //	modal: false,
    //	closeWith: ['click'], // ['click', 'button', 'hover']
    //	callback: {
    //		onShow: function() {},
    //		afterShow: function() {},
    //		onClose: function() {},
    //		afterClose: function() {}
    //	},
    //	buttons: false // an array of buttons
    //};

    // Types:
    // alert
    // success
    // error
    // warning
    // information
    // confirm

    $("body").on('click', ".SubmitBid", function (event) {
        event.preventDefault();
        var $submitBidLink = $(this);
        var player = $submitBidLink.parent().find("input[type=hidden]").val();
        var handId = $("div#" + player).find("input.PlayerId").val();
        var bidValue = $submitBidLink.siblings().find('input').val();
        var dataJson = "{ channelName: '" + channelName + "', gameId: '" + gameId + "', handId: '" + handId + "', bidValue: '" + bidValue + "',  socketId: '" + socketId + "'}";
        //console.log(dataJson);

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/Services/Setback.asmx/SubmitBid",
            data: dataJson,
            dataType: "json",
            success: displayBidResponse, // displayHand,
            error: displayError
        });
    });

    $("body").on('click', ".PassBid", function (event) {
        event.preventDefault();
        var $passBidLink = $(this);
        var player = $passBidLink.parent().find("input[type=hidden]").val();
        var handId = $("div#" + player).find("input.PlayerId").val();
        //var handId = $(this).parents('div.Player').find("input.PlayerId").val();
        var dataJson = "{ channelName: '" + channelName + "', gameId: '" + gameId + "', handId: '" + handId + "', socketId: '" + socketId + "'}";
        //console.log(dataJson);

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/Services/Setback.asmx/PassBid",
            data: dataJson,
            dataType: "json",
            success: displayBidResponse, // displayHand,
            error: displayError
        });
    });

    $("body").on('click', ".Diamonds, .Spades, .Hearts, .Clubs", function (event) {
        event.preventDefault();
        var $trumpLink = $(this);
        var player = $trumpLink.parents("div").find("input[type=hidden]").val();
        var handId = $("div#" + player).find("input.PlayerId").val();
        var trumpValue = $trumpLink.attr('class');
        var dataJson = "{ channelName: '" + channelName + "', gameId: '" + gameId + "', handId: '" + handId + "', trumpValue: '" + trumpValue + "',  socketId: '" + socketId + "'}";

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/Services/Setback.asmx/SubmitTrump",
            data: dataJson,
            dataType: "json",
            success: function () {
                myOpenTipTrumpControls.deactivate();
            } //,
            //error: function () { alert('error!'); }
        });
    });

    $('a#DiscardConfirmation').click(function (event) {
        event.preventDefault();
        var $confirmationLink = $(this);
        //var $playerDiv = $(this).parents('div.Player');
        var $playerDiv = $('div#Player' + playerNumber);
        var handId = $playerDiv.children().eq(0).val();
        var cardIDs = new Array();
        $('img', $playerDiv).each(function (index, elements) {
            var $card = $(this);
            if ($card.hasClass('markedForDiscard')) cardIDs.push($card.attr('id'));
        });

        var dataJson = "{ channelName: '" + channelName + "', gameId: '" + gameId + "', handId: '" + handId + "', markedForDiscard: '" + cardIDs.join() + "',  socketId: '" + socketId + "'}";

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/Services/Setback.asmx/DiscardNonTrumps",
            data: dataJson,
            dataType: "json"//,
            //success: function () { alert('success!'); },
            //error: function () { alert('error!'); }
        });
    });
});