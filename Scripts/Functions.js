// Read a page's GET URL variables and return them as an associative array.
function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function playerStartTrick(playerId) {
    //console.log(playerId);
    //console.log(playerNumber);
    if (playerId == playerNumber) {
        $('div#Player' + playerId + ' img').on('click', function (event) {
            PlayCard($(this));
        });
    }
}

function playerDealNewCards(newHand, playerId) {

    // Grab the players hand of cards
    var $playersCards = $('div#Player' + playerId + ' div.Cards');

    // Count how many are currently there.
    var cardCount = $playersCards.children().length;

    // Create arrays to track the original and cloned cards.
    var originalCards = new Array();

    // Split the newly dealt card ids into an array.
    var newHandIds = newHand.split(",");
    
    // Loop through the card ids.
    for (var i = 0; i < newHandIds.length; i++) {
        var playingCardCode = newHandIds[i];

        // Locate the original card
        var $playingCard = $('img[id=' + playingCardCode + ']');

        // Store the original in the array
        originalCards.push($playingCard);

        // Clone the card in memory.
        var $clonedPlayingCard = $playingCard.clone();
        
        // Hide the card
        $clonedPlayingCard.css('visibility', 'hidden');
        if (playerId == playerNumber) $clonedPlayingCard.attr('src', 'Images/' + playingCardCode + '.png');
        
        // Add the hidden clone to the players hand of cards
        $clonedPlayingCard.appendTo($playersCards);
    }

    // Fix the positioning of the cards in the players hand.
    $("img", $playersCards).each(function (index, element) {
        var card = $(this);
        card.css('left', index * 18);
        card.data('position', card.position());
    });

    // Animate the newly dealt cards.
    for (var i = 0; i < originalCards.length; i++) {
        console.log(cardCount);
        $sourceCard2 = originalCards[i];
        $destinationCard2 = $playersCards.children().eq(i + cardCount);

        var destinationCard2 = $destinationCard2;
        var sourceCard2 = $sourceCard2;

        var destinationCardOffset = destinationCard2.offset();
        var cardOffset = sourceCard2.offset();
        var cardPosition = sourceCard2.position();
        var diffTop = destinationCardOffset.top - cardOffset.top;
        var diffLeft = destinationCardOffset.left - cardOffset.left;
        var offsetTop = cardPosition.top + diffTop;
        var offsetLeft = cardPosition.left + diffLeft;

        //setTimeout(function () {
        //    sourceCard2.animate({ top: offsetTop, left: offsetLeft }, fullDuration, "swing", function () {
        //        destinationCard2.css('visibility', 'visible');
        //        sourceCard2.remove();
        //    });
        //}, 250 * i);

        console.log($sourceCard2);
        console.log($destinationCard2);

        setTimeout(function () {
            sourceCard2.animate({ top: offsetTop, left: offsetLeft }, fullDuration, "swing", function () {

                // If the current player is the person being dealt the new cards, then show the widow cards.
                if (playerId == playerNumber) {
                    sourceCard2.fadeOut((fullDuration / 2), function () {
                        sourceCard2.attr('src', 'Images/' + destinationCard2.attr('id') + '.png');
                        sourceCard2.fadeIn(fullDuration / 2);
                    });
                }

                //if (i == (originalCards.length - 1)) {
                //    for (var j = 0; j < newHandIds; j++) {
                //        $('img[id=' + newHandIds[j] + ']', $playersCards).css('visibility', 'visible');
                //        $('div#Deck div.Cards img[id=' + newHandIds[j] + ']').remove();
                //    }
                //}
            });
        }, 250 * i);
    }
}

function playerDiscard(playerId, markedForDiscard, newCards) {
    var cardIDs = markedForDiscard.split(',');
    while (cardIDs.length > 0) $('img[id=' + cardIDs.pop() + ']').remove();

    cardIDs = newCards.split(',');
    while (cardIDs.length > 0) {
        var cardId = cardIDs.pop();
        $('img[id=' + cardId + ']').remove();
        if (playerId == playerNumber) {
            $('div#Player' + playerId + ' div.Cards').append('<img id="' + cardId + '" class="PlayingCard" src="Images/' + cardId + '.png" alt="" />');
        }
        else {
            $('div#Player' + playerId + ' div.Cards').append('<img id="' + cardId + '" class="PlayingCard" src="Images/b1fv.png" alt="" />');
        }
    }

    $('div#Player' + playerId + ' img').each(function (index, element) {
        var card = $(this);
        card.css('left', index * 18);
        card.data('position', card.position());
        card.off('click');
    });
}

//function playerDiscard(markedForDiscard, playerId) {
//    var cards = new Array();
//    var cardIDs = markedForDiscard.split(',');
//    while (cardIDs.length > 0) cards.push($('img[id=' + cardIDs.pop() + ']'));

//    var $discardPile = $('div#Discard div.Cards');
//    var discardPileCount = $discardPile.children().length;

//    for (var i = 0; i < cards.length; i++) {
//        var $clonedCard = $(cards[i]).clone();
//        $clonedCard.css('visibility', 'hidden');
//        $clonedCard.css('left', 0);
//        $clonedCard.appendTo($discardPile);
//    }

//    $(cards).each(function (index, element) {
//        $sourceCard = $(this);
//        $destinationCard = $discardPile.children().eq(index + discardPileCount);

//        var $parent = null;
//        if (index == cards.length) var $parent = cards[0].parent;

//        var destinationCard = $destinationCard;
//        var sourceCard = $sourceCard;

//        var destinationCardOffset = destinationCard.offset();
//        var cardOffset = sourceCard.offset();
//        var cardPosition = sourceCard.position();
//        var diffTop = destinationCardOffset.top - cardOffset.top;
//        var diffLeft = destinationCardOffset.left - cardOffset.left;
//        var offsetTop = cardPosition.top + diffTop;
//        var offsetLeft = cardPosition.left + diffLeft;

//        setTimeout(function () {
//            sourceCard.animate({ top: offsetTop, left: offsetLeft }, fullDuration, "swing", function () {
//                if (playerId == playerNumber) {
//                    sourceCard.fadeOut(fullDuration / 2);
//                    sourceCard.attr('src', 'Images/b1fv.png');
//                    destinationCard.attr('src', 'Images/b1fv.png');
//                    destinationCard.css('visibility', 'visible');
//                    sourceCard.remove();
//                }

//                if ($parent != null) {
//                    $("img", $parent).each(function (index, element) {
//                        var card = $(this);
//                        card.css('left', index * 18);
//                        card.data('position', card.position());
//                    });
//                }
//            });
//        }, 250 * index);

//    });

//    if (cards.length > 0) {
//        if (cards[1].parents('.Player').attr('id') == 'Player' + playerNumber) {
//            $('div#Player' + playerNumber + ' img.PlayingCard').off('click');
//        }
//    }
//}

function setupDiscard() {
    // create noty to tell users to click on card to mark for discard.
    $('div#Player' + playerNumber + ' img.PlayingCard').click(MarkForDiscard);
}

function MarkForDiscard(event) {
    event.preventDefault();

    var card = $(this);

    //console.log(card);

    var cardPosition = card.position();
    var offsetTop = cardPosition.top;
    var offsetLeft = cardPosition.left;

    var playerId = card.parents(".Player").attr("id");
    playerId = playerId.substr(playerId.length - 1);

    var distance = 25;
    var markedForDiscard = card.hasClass('markedForDiscard');

    if (markedForDiscard) {
        card.animate({ top: offsetTop + distance, left: offsetLeft }, fullDuration);
        card.removeClass('markedForDiscard', false);
    }
    else {
        card.animate({ top: offsetTop - distance, left: offsetLeft }, fullDuration);
        card.addClass('markedForDiscard', true);
    }

}  // End: function MarkForDiscard(event)

function awardWidow(winningBidder) {
    // We no longer need the bidding box
    myOpenTip.deactivate();

    // Make an in-memory copy of the widow cards.
    // Hide the in-memory cards (visibility:hidden)
    // Place the in-memory widow cards in the cards div the of player that won the bid
    // Animate the widow cards to the player's cards.
    // Display the in memory cards.
    // Remove the widow cards from the DOM.
    $winningBiddersCards = $('div#Player' + winningBidder + ' div.Cards');
    $clonedCards = $('div#Widow div.Cards').clone()
    $("img", $clonedCards).css('visibility', 'hidden');

    setTimeout(function () {
        //$("img", $clonedCards).css('visibility', 'visible');
        $clonedCards.appendTo($winningBiddersCards);
        $clonedCards.children().eq(0).unwrap();

        $("img", $winningBiddersCards).each(function (index, element) {
            var card = $(this);
            card.css('left', index * 18);
            card.data('position', card.position());
        });

        // Animate the widow cards to move to the winning bidder.
        // If the current player is the winning bidder, then reveal the cards.
        $('div#Widow div.Cards img').each(function (index, element) {
            $sourceCard = $(this);
            $destinationCard = $winningBiddersCards.children().eq(index + 6)

            var destinationCard = $destinationCard;
            var sourceCard = $sourceCard;

            var destinationCardOffset = destinationCard.offset();
            var cardOffset = sourceCard.offset();
            var cardPosition = sourceCard.position();
            var diffTop = destinationCardOffset.top - cardOffset.top;
            var diffLeft = destinationCardOffset.left - cardOffset.left;
            var offsetTop = cardPosition.top + diffTop;
            var offsetLeft = cardPosition.left + diffLeft;

            setTimeout(function () {
                sourceCard.animate({ top: offsetTop, left: offsetLeft }, fullDuration, "swing", function () {
                    // If the current player is the winnding bidder, show the widow cards.
                    if (winningBidder == playerNumber) {

                        if (index != 6) {
                            sourceCard.fadeOut((fullDuration / 2), function () {
                                destinationCard.attr('src', 'Images/' + destinationCard.attr('id') + '.png');
                                sourceCard.attr('src', 'Images/' + destinationCard.attr('id') + '.png');
                                sourceCard.fadeIn(fullDuration / 2);
                            });
                        }
                        else {
                            // Clean up
                            setTimeout(function () {
                                $winningBiddersCards.children().filter(function (index) { return (index > 5); }).css('visibility', 'visible');
                                $('div#Widow div.Cards img').remove();

                                // Display the trump controls
                                if (playerNumber == winningBidder) displayTrumpControls("Player" + winningBidder);
                            }, fullDuration - 250)
                        }
                    }
                    // If the player is not the winning bidder, clean up the cards without revealing them.
                    else {
                        // The last of the widow cards is showing.  Fade it out, change the card to be a card back, and fade it back in.
                        if (index == 6) {
                            sourceCard.fadeOut((fullDuration / 2), function () {
                                destinationCard.attr('src', 'Images/b1fv.png');
                                sourceCard.attr('src', 'Images/b1fv.png');
                                sourceCard.fadeIn((fullDuration / 2), function () {
                                    $winningBiddersCards.children().filter(function (index) { return (index > 5); }).css('visibility', 'visible');
                                    $('div#Widow div.Cards img').remove();

                                    // Display the trump controls
                                    if (playerNumber == winningBidder) displayTrumpControls("Player" + winningBidder);
                                })
                            });
                        }
                    }
                });
            }, 250 * index);
        });
    }, 100);
}

function displayHand(data, textStatus, jqXHR) {
    if (data.d != null && data.d != "") {
        results = eval("(" + data.d + ")");

        //console.log(data);
        //console.log(textStatus);
        //console.log(jqXHR);

        // Grab the "player" container div and id attribute
        var playerDiv = $("input[value=" + results[0] + "]").parent();
        var playerDivId = playerDiv.attr("id");
        // Determine if the cards belong to the widow.
        var isWidow = ("Widow" == playerDivId);
        // Determine if the cards belong to the current player.
        var isCurrentPlayer = (("Player" + playerNumber) == playerDivId);

        var cardImages = new Array();
        var showCards = (playerNumber == undefined || playerNumber == "" || isCurrentPlayer);
        for (var i = 1; i < results.length; i++) {
            if (showCards || (isWidow && i == results.length)) {
                cardImages.push('<img id="' + results[i] + '" src="Images/' + results[i] + '.png" alt="" class="PlayingCard"/>');
            }
            else {
                cardImages.push('<img id="' + results[i] + '" src="Images/b1fv.png" alt="" class="PlayingCard"/>');
            }

        }
        var cardsDiv = playerDiv.find("div.Cards");
        cardsDiv.append(cardImages);

        var playerId = cardsDiv.parent().attr("id");
        playerId = playerId.substr(playerId.length - 1);
        destinationCardSelector = "#Card" + playerId;

        // Cards may not be played until the bids have been made
        $("img", cardsDiv).each(function (index, element) {
            var card = $(this);
            card.css('left', index * 18);
            card.data('position', card.position());
            //if (isCurrentPlayer) card.draggable({ revert: "invalid" });
        });
    }
}

function displayDeckHand(data, textStatus, jqXHR) {
    if (data.d != null && data.d != "") {
        results = eval("(" + data.d + ")");

        // Grab the "player" container div and id attribute
        var playerDiv = $("input[value=" + results[0] + "]").parent();
        var playerDivId = playerDiv.attr("id");

        var cardImages = new Array();
        for (var i = 1; i < results.length; i++) {
            cardImages.push('<img id="' + results[i] + '" src="Images/b1fv.png" alt="" class="PlayingCard"/>');
        }

        var cardsDiv = playerDiv.find("div.Cards");
        cardsDiv.append(cardImages);

        //var playerId = cardsDiv.parent().attr("id");
        //playerId = playerId.substr(playerId.length - 1);
        //destinationCardSelector = "#Card" + playerId;

        //// Cards may not be played until the bids have been made
        //$("img", cardsDiv).each(function (index, element) {
        //    var card = $(this);
        //    card.css('left', index * 18);
        //    card.data('position', card.position());
        //    //if (isCurrentPlayer) card.draggable({ revert: "invalid" });
        //});
    }
}

function displayError() {
    alert("Doh! Something went wrong.  Sorry about that.");
}

function displayBidControls(playerDivId) {
    myOpenTip = new Opentip("#GameId", $("div#" + playerDivId + " .BiddingControls").html(), "", {
        target: "div#" + playerDivId + " div.Cards",
        tipJoint: "bottom",
        showOn: null,
        style: "glass"
    });
    myOpenTip.prepareToShow();
}

function displayTrumpControls(playerDivId) {
    myOpenTipTrumpControls = new Opentip("#GameId", $("div#" + playerDivId + " .TrumpControls").html(), "", {
        target: "div#" + playerDivId + " div.Cards",
        tipJoint: "bottom",
        showOn: null,
        style: "glass"
    });
    myOpenTipTrumpControls.prepareToShow();
}


function displayBidResponse(data, textStatus, jqXHR) {
    results = eval("(" + data.d + ")");
    //console.log(results.IsError);
    //console.log(typeof results.IsError);
    if (results.IsError) noty({ text: results.Message, type: 'error' });
    else {
        $("div#Player" + results.PlayerNumber + " span.BidText").text(results.Message);
        //$("div#Player" + results.PlayerNumber + " div.BiddingControls").hide("slow");
        myOpenTip.prepareToHide(function () {
            myOpenTip.deactivate();
        });
        //var nextPlayerNumber = results.PlayerNumber + 1;
        //if (nextPlayerNumber > 4) nextPlayerNumber = 1;
        //console.log(nextPlayerNumber);
        //console.log("div#Player" + nextPlayerNumber + " div.BiddingControls");
        //$("div#Player" + nextPlayerNumber + " div.BiddingControls").show("slow");
    }
}

function postMove(string) {
    var $move = $('<p>' + string + '</p>');
    $move.hide();
    $('div#Moves').prepend($move);
    $move.slideToggle();
}

// I don't think this method is used on the client side anymore.  The cards are sent down on page load...
function loadHand(index, element) {
    // don't load the hand for the discard pile, yet...
    if ($(this).parent().attr('id') == "Discard") return;

    var handId = $(element).val();
    var dataJson = "{ channelName: '" + channelName + "', gameId: '" + gameId + "', handId: '" + handId + "' }";
    //console.log(dataJson);

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "/Services/Setback.asmx/GetHand",
        data: dataJson,
        dataType: "json",
        success: displayHand,
        error: displayError
    });
}

function displayDeck() {
    var dataJson = "{ 'gameId': '" + gameId + "'}";
    //console.log(dataJson);

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "/Services/Setback.asmx/GetDeck",
        data: dataJson,
        dataType: "json",
        //success: displayHand,
        success: displayDeckHand,
        error: displayError
    });
}

//function moveRight(card) {
//    var currLeftValue = card.data('leftValue');
//    card.animate({ 'left': currLeftValue + 100 }, fullDuration);
//}
//function moveLeft(card) {
//    var currLeftValue = card.data('leftValue');
//    //console.log(card);
//    //console.log(currLeftValue);
//    //console.log(fullDuration);
//    card.animate({ 'left': (currLeftValue) }, fullDuration);
//}

function untilt() {
    $(this).rotate({
        animateTo: 0,
        duration: halfDuration
    });
}
function tiltRight(card) {
    card.rotate({
        angle: 0,
        animateTo: rotationAngle,
        duration: halfDuration,
        callback: untilt
    });
}
function tiltLeft(card) {
    card.rotate({
        angle: 0,
        animateTo: (-1 * rotationAngle),
        duration: halfDuration,
        callback: untilt
    });
}

function goRight(card) {
    //tiltRight(card);
    moveRight(card);
}
function goLeft(card) {
    //tiltLeft(card);
    moveLeft(card);
}

function UpdateCardPlayed(card) {
    var playerId = card.parents(".Player").attr("id");
    playerId = playerId.substr(playerId.length - 1);
    //console.log("Player ID:" + playerId);
    destinationCard = $("#Card" + playerId)
    if (destinationCard.length > 0) {
        var destinationCardOffset = destinationCard.offset();
        var cardOffset = card.offset();
        var cardPosition = card.position();
        var diffTop = destinationCardOffset.top - cardOffset.top;
        var diffLeft = destinationCardOffset.left - cardOffset.left;
        var offsetTop = cardPosition.top + diffTop;
        var offsetLeft = cardPosition.left + diffLeft;
        //console.log(destinationCardOffset);
        //console.log(cardOffset);
        //console.log(diffTop);
        //console.log(diffLeft);
        //console.log(offsetTop);
        //console.log(offsetLeft);
        card.animate({ top: offsetTop, left: offsetLeft }, fullDuration, "swing", function () {
            if (card.attr('src') == 'Images/b1fv.png') {
                card.fadeOut(halfDuration, function () {
                    card.attr('src', 'Images/' + card.attr('id') + '.png');
                    card.fadeIn(halfDuration);
                });
            }
        });
    }
}

function PlayCard(card) {
    //UpdateCardPlayed(card);

    var handId = $(card).parent().parent().find("input.PlayerId").val();
    var dataJson = "{ channelName: '" + channelName + "', gameId: '" + gameId + "', handId: '" + handId + "', 'cardId': '" + card.attr("id") + "', socketId: '" + socketId + "'}";

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "/Services/Setback.asmx/triggerCardPlayed",
        data: dataJson,
        dataType: "json"
        //,success: displayHand,
        //error: displayError
    });
}