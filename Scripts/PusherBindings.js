$(document).ready(function () {
    // Open a connection to Pusher
    var pusher = new Pusher('8bf5a558afbb3d828d62');
    //Pusher.channel_auth_endpoint = '/Services/Setback.asmx/AuthUser';

    // Get the socketId
    pusher.connection.bind('connected', function () {
        socketId = pusher.connection.socket_id;
    });

    // Subscribe to a Channel
    var channel = pusher.subscribe(channelName);
    //channel.bind('pusher:subscription_succeeded', function () {
    //    me = channel.members.me;
    //    userId = me.id;
    //    userInfo = me.info;
    //});

    //channel.bind_all(function (event, data) {
    //    //alert('something');
    //    console.log(event);
    //    console.log(data);
    //});

    // Listen for events on your channel
    channel.bind('card-played', function (data) {
        var card = $("#" + data.cardId);
        if (!card.data('clicked')) {
            UpdateCardPlayed(card);
            card.data('clicked', true);
        }

        if (data.playerId == playerNumber) {
            $('div#Player' + data.playerId + ' img').off('click');
        }
        else if (data.nextPlayer == playerNumber) {
            $('div#Player' + data.nextPlayer + ' img').on('click', function (event) {
                PlayCard($(this));
            });
        }
    });

    // If we recieve a bid, display the move in the div on the right of the page.
    channel.bind('bid-recieved', function (data) {
        postMove(data.moveDisplayText);
        if (data.nextPlayer && playerNumber == data.nextPlayer) displayBidControls("Player" + playerNumber);
    });

    // If a player passes on biding, display the move in the div on the right of the page.
    channel.bind('bid-passed', function (data) {
        //console.log(data);
        postMove(data.moveDisplayText);
        if (data.nextPlayer && playerNumber == data.nextPlayer) displayBidControls("Player" + playerNumber);
    });

    // After the bids have been submitted, the widow needs to be awarded.
    channel.bind('bids-processed', function (data) {
        postMove(data.moveDisplayText);
        awardWidow(data.playerValue);
    });

    // After the bids have been submitted, the widow needs to be awarded.
    channel.bind('trump-selected', function (data) {
        postMove(data.moveDisplayText);
        setupDiscard();
    });

    // After a player discards, remove them from their hand.
    channel.bind('player-discarded', function (data) {
        postMove(data.moveDisplayText);
        playerDiscard(data.playerId, data.markedForDiscard, data.newHand);
        //playerDiscard(data.markedForDiscard, newHand, playerId);
        //playerDealNewCards(data.newHand, data.playerId);
    });

    // After players finish discarding, people can start playing tricks.
    channel.bind('discarding-complete', function (data) {
        //console.log(data);
        postMove(data.moveDisplayText);
        playerStartTrick(data.playerId);
        //playerDiscard(data.markedForDiscard, newHand, playerId);
        //playerDealNewCards(data.newHand, data.playerId);
    });
});