( function ( $ ) {
	var LIP;

	/**
	 * @class mlb.LightboxInterface
	 * @constructor
	 */
	function LightboxInterface() {
		var addToPre = [],
			addToPost = [],
			lbinterface = this;

		// Staging area for image resizes
		this.$staging = $( '<div>' )
			.addClass( 'mlb-staging-area' );
		$( document.body ).append( this.$staging );

		this.$overlay = $( '<div>' )
			.addClass( 'mlb-overlay' );

		this.$wrapper = $( '<div>' )
			.addClass( 'mlb-wrapper' );

		this.$main = $( '<div>' )
			.addClass( 'mlb-main' );

		this.$imageDiv = $( '<div>' )
			.addClass( 'mlb-image' );

		// I blame CSS for this
		this.$innerWrapper = $( '<div>' )
			.addClass( 'mlb-image-inner-wrapper' )
			.append( this.$imageDiv );

		this.$imageWrapper = $( '<div>' )
			.addClass( 'mlb-image-wrapper' )
			.append( this.$innerWrapper );

		this.$preDiv = $( '<div>' )
			.addClass( 'mlb-pre-image' );
		this.setupPreDiv( addToPre );

		this.$postDiv = $( '<div>' )
			.addClass( 'mlb-post-image' );
		this.setupPostDiv( addToPost );

		this.$main.append(
			this.$preDiv,
			this.$imageWrapper,
			this.$postDiv
		);

		this.$wrapper.append(
			this.$main
		);

		window.addEventListener( 'keyup', function ( e ) {
			if ( e.keyCode === 27 ) {
				// Escape button pressed
				lbinterface.unattach();
			}
		} );
	}

	LIP = LightboxInterface.prototype;

	/**
	 * The currently selected LightboxImage.
	 * @type {mlb.LightboxImage}
	 * @protected
	 */
	LIP.currentImage = null;

	LIP.empty = function () {
		this.$imageDiv.empty();

		if ( this.resizeListener ) {
			window.removeEventListener( 'resize', this.resizeListener );
			this.resizeListener = null;
		}
	};

	/**
	 * Attaches interface to document or given parent id.
	 *
	 * @param {string} [parentId] parent id where we want to attach the UI. Mainly for testing.
	 */
	LIP.attach = function ( parentId ) {
		var lbinterface = this,
			$parent;

		// Re-appending the same content can have nasty side-effects
		// Such as the browser leaving fullscreen mode if the fullscreened element is part of it
		if ( this.currentlyAttached ) {
			return;
		}

		$( document ).on( 'jq-fullscreen-change.lip', function( e ) {
			lbinterface.fullscreenChange( e );
		} );

		$parent = $( parentId || document.body );

		// Clean up fullscreen data because hard-existing fullscreen might have left
		// jquery.fullscreen unable to remove the class and attribute, since $main wasn't
		// attached to the DOM anymore at the time the jq-fullscreen-change event triggered
		this.$main.data( 'isFullscreened', false ).removeClass( 'jq-fullscreened' );
		this.isFullscreen = false;

		$parent
			.append(
				this.$wrapper,
				this.$overlay
			);
		this.currentlyAttached = true;
	};

	/**
	 * Unattaches interface from parent element.
	 */
	LIP.unattach = function () {
		// We trigger this event on the document because unattach() can run
		// when the interface is unattached
		$( document ).trigger( $.Event( 'mmv-close' ) )
			.off( 'jq-fullscreen-change.lip' );

		this.$wrapper.detach();
		this.$overlay.detach();

		this.currentlyAttached = false;
	};

	/**
	 * Resize callback
	 * @protected
	 */
	LIP.resizeCallback = function() {
		if ( this.currentlyAttached ) {
			this.$wrapper.trigger( $.Event( 'mmv-resize') );

			this.autoResizeImage();
		}
	};
	/**
	 * Displays an already loaded image.
	 * This is an alternative to load() when we have an image element with the image already loaded.
	 * @param {mlb.LightboxImage} image
	 * @param {HTMLImageElement } imageElement
	 */
	LIP.showImage = function( image, imageElement ) {
		var iface = this;

		this.currentImage = image;
		image.globalMaxWidth = imageElement.width;
		image.globalMaxHeight = imageElement.height;
		this.$image = $( imageElement );

		this.autoResizeImage();

		// Capture listener so we can remove it later, otherwise
		// we are going to leak listeners !
		if ( !this.resizeListener ) {
			this.resizeListener = function () { iface.resizeCallback(); };
			window.addEventListener( 'resize', this.resizeListener );
		}
	};

	/**
	 * Loads the image, then calls the load callback of the interface.
	 * @param {mlb.LightboxImage} image
	 */
	LIP.load = function ( image ) {
		var iface = this;

		this.currentImage = image;

		image.getImageElement().done( function( image, ele ) {
			iface.showImage( image, ele );
		} );
	};

	LIP.autoResizeImage = function () {
		this.$staging.append( this.$image );
		this.currentImage.autoResize( this.$image.get( 0 ), this.$imageDiv );
		this.$imageDiv.append( this.$image );
	};

	/**
	 * Changes what image is being displayed.
	 * @param {HTMLImageElement} imageEle
	 */
	LIP.replaceImageWith = function ( imageEle ) {
		var $image = $( imageEle );

		this.currentImage.src = imageEle.src;

		this.$image.replaceWith( $image );
		this.$image = $image;

		this.currentImage.globalMaxWidth = this.$image.width();
		this.currentImage.globalMaxHeight = this.$image.height();
		this.currentImage.autoResize( imageEle );
	};

	LIP.exitFullscreen = function () {
		this.fullscreenButtonJustPressed = true;
		this.$main.exitFullscreen();
	};

	LIP.enterFullscreen = function () {
		this.$main.enterFullscreen();
	};

	LIP.setupPreDiv = function ( toAdd ) {
		var lbinterface = this;

		this.$controlBar = $( '<div>' )
			.addClass( 'mlb-controls' );

		this.$closeButton = $( '<div>' )
			.text( ' ' )
			.addClass( 'mlb-close' )
			.click( function () {
				lbinterface.unattach();
			} );

		this.$fullscreenButton = $( '<div>' )
			.text( ' ' )
			.addClass( 'mlb-fullscreen' )
			.click( function () {
				if ( lbinterface.isFullscreen ) {
					lbinterface.exitFullscreen();
				} else {
					lbinterface.enterFullscreen();
				}
			} );

		this.setupFullscreenButton();

		this.$controlBar.append(
			this.$closeButton,
			this.$fullscreenButton
		);

		this.$preDiv.append( this.$controlBar );

		this.addElementsToDiv( this.$preDiv, toAdd );
	};

	LIP.setupFullscreenButton = function () {
		// If the browser doesn't support fullscreen mode, hide the fullscreen button
		if ( $.support.fullscreen ) {
			this.$fullscreenButton.show();
		} else {
			this.$fullscreenButton.hide();
		}
	};

	LIP.setupPostDiv = function ( toAdd ) {
		this.addElementsToDiv( this.$postDiv, toAdd );
	};

	LIP.addElementsToDiv = function ( $div, toAdd ) {
		var i;

		for ( i = 0; i < toAdd.length; i++ ) {
			$div.append( toAdd[i] );
		}
	};

	LIP.fullscreenChange = function ( e ) {
		this.isFullscreen = e.fullscreen;

		if ( !this.fullscreenButtonJustPressed && !e.fullscreen ) {
			// Close the interface all the way if the user pressed 'esc'
			this.unattach();
		} else if ( this.fullscreenButtonJustPressed ) {
			this.fullscreenButtonJustPressed = false;
		}
	};

	window.LightboxInterface = LightboxInterface;
}( jQuery ) );
