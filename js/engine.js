//	############################################################################
//
//	Early sketch of "filmstrip" loading code, made to stagger the loading in
//	of images
//
//	############################################################################


control = {

	currentScene: 1,
	scenes: {
		1: {
			startframe: 0,
			endframe: 265,
			loadstep: 64,
			loaded: {},
			allLoaded: false,
			sceneType: 'scrubbing',
			glitch: {
				is: false,
				frame: null,
				timer: null
			}
		}
	},
	totalFrames: 0,
	loadingframe: null,
	screenSize: {
		width: null,
		height: null
	},
	imageSize: {
		width: null,
		height: null
	},
	setsize: false,
	resizerTMR: null,
	mousemouseTMR: null,
	framesSource: 'scene1',
	maxScrub: 526,
	glitching: false,
	forceGlitch: false,

	init: function() {

		//	grab the dimensions of the screen
		this.screenSize.width = $(window).innerWidth();
		this.screenSize.height = $(window).innerHeight();

		//	work out how many frames we are going to be loading in total
		for (var s in this.scenes) {
			this.totalFrames += this.scenes[s].endframe - this.scenes[s].startframe + 1;
		}

		//	set the filmstrip to the correct width to hold them all
		$('.filmstrip').css({width: (this.screenSize.width * this.totalFrames)});

		
		//	preload the first scene, set the loading frame to the start of the first
		//	frame. And then start loading in all the images.
		this.preloadScene();
		this.loadingframe = this.scenes[this.currentScene].startframe;
		this.loadimages();


		// bind the body
		$(document).bind('mousemove', function(e) {


			//	do the mouse pointer position type stuff
			var x = e.pageX;
			var w = $(window).innerWidth();
			var p = x / w;
			var f = Math.floor(control.maxScrub * p);

			//	make sure we have a loaded frame.


			//	Jump the film strip to the correct point.
			if (control.scenes[control.currentScene].sceneType == 'scrubbing') {
				control.showFrame(f);
			}
			//	also set the glitchpoint which is where we'll glitch around should we need to.
			control.glitchpoint = f;

			//	If the mouse is moving then turn the glitching off
			if (control.forceGlitch != true) {
				clearTimeout(control.mousemouseTMR);
				clearTimeout(control.glitchingTMR);
				control.glitching = false;

				//	set it to start again in a couple of seconds
				control.mousemouseTMR = setTimeout(function() {
					control.glitching = true;
					control.glitchingTMR = setInterval(function() {control.glitch();}, 50);				
				}, 2000);
			}

		});

		$('.spot').bind('mouseenter', function(e) {
			control.forceGlitch = true;
			control.glitching = true;
			clearTimeout(control.mousemouseTMR);
			control.glitchingTMR = setInterval(function() {control.glitch();}, 50);				
		})

		$('.spot').bind('mouseleave', function(e) {
			control.forceGlitch = false;
			control.glitching = false;
			clearTimeout(control.mousemouseTMR);
			clearTimeout(control.glitchingTMR);
		})

		//	when we answer an answer we want to start glitching
		/*
		$('.answer').bind('mouseenter', function(){
			control.glitching = true;
			control.glitchingTMR = setInterval(function() {control.glitch();}, 50);
		});
		
		$('.answer').bind('mouseleave', function() {
			control.glitching = false;
			clearTimeout(control.glitchingTMR);
		});
		*/

		$(window).resize(function() {
			clearTimeout(control.resizerTMR);
			control.resizerTMR = setTimeout(function() {control.resizeend();}, 333);
		});

	},

	
	//	I want to fill up the film strip with empty images for the scene we are about to load
	preloadScene: function() {

		for (var i = this.scenes[this.currentScene].startframe; i <= this.scenes[this.currentScene].endframe; i++) {
			var img = $('<img>');
			var filename = 'frame' + i + '.jpg';
			img.addClass('frame frame' + i);
			img.css({
				width: this.screenSize.width
			});
			img.attr({id: 'scene' + this.currentScene + '_frame' + (i - this.scenes[this.currentScene].startframe)});
			$('.filmstrip').append(img);
		}
	},


	loadimages: function() {


		//	if the current frame is marked as -1, then it means we have loaded in
		//	all the frames for the current scene

		if (control.loadingframe == -1) {
			//console.log('finished');
			return;
		}

		//	if we have already loaded this frame then don't load it in again
		if (control.loadingframe in control.scenes[control.currentScene].loaded) {
			control.nextframe();
			control.loadimages();
			return;
		}
		
		//	get the image we are going to load the frame into
		//	Once the image has loaded then we need to move onto the next image to load
		var img = $('.frame' + control.loadingframe);

		//	NOTE: There is no error checking here for a failed image load. We need to
		//	create a dummy image (to we can take up the right amount of space on the
		//	filmstrip) and mark is as "failed" (which means we should change our
		//	flag from true/false to 1/0/-1) so we don't attempt to load this frame again
		//	on a 2nd pass but the validFrame function can report it as bad.
		img.bind('load', function() {

			//	if we haven't set the size yet, then we need to do that here.
			if (!control.setsize) {
				control.imageSize.width = $(this).width();
				control.imageSize.height = $(this).height();
				control.setsize = true;
			}

			//	set that we have loaded this image
			control.scenes[control.currentScene].loaded[control.loadingframe] = true;

			//	add a cell into the progress bar
			var cell = $('<div>').addClass('cell cell' + control.loadingframe).css({
				top: 0,
				left: ((control.loadingframe - control.scenes[control.currentScene].startframe) * 4) + 'px'
			});
			$('.bar').append(cell);
			$('.loading').html($('.cell').length + '/' + (control.scenes[control.currentScene].endframe - control.scenes[control.currentScene].startframe + 1));

			control.nextframe();
			setTimeout(function() {control.loadimages();}, 10);

		});



		var filename = String(control.loadingframe);
		if (filename.length == 1) filename = '000' + filename;
		if (filename.length == 2) filename = '00' + filename;
		if (filename.length == 3) filename = '0' + filename;
		img.attr({
			src: control.framesSource + '/frame' + filename + '.jpg'
		});

	},


	//	this bumps the loadingframe pointer onto the next one
	nextframe: function() {

		//	bump it forwards by the amount we are currently stepping
		this.loadingframe += this.scenes[this.currentScene].loadstep;

		if (this.loadingframe > this.scenes[this.currentScene].endframe) {

			//	if we have gotten off the end, and the loadstep was doing one
			//	at a time, then we set the loadingframe to -1 to indicate that
			//	we have finished [YES, I KNOW THIS IS A TERRIBLE WAY OF DOING THIS]
			if (this.scenes[this.currentScene].loadstep == 1) {
				this.loadingframe = -1;
				return;
			}

			//	otherwise we reduce the loading frame and start again at the begining
			this.scenes[this.currentScene].loadstep = this.scenes[this.currentScene].loadstep / 2;
			this.loadingframe = this.scenes[this.currentScene].startframe;

		}

	},

	resizeend: function() {
		control.screenSize.width = $(window).innerWidth();
		control.screenSize.height = $(window).innerHeight();
		$('.filmstrip img').css({
			width: control.screenSize.width + 'px'
		});
	},

	glitch: function() {

		var glitchAmount = 4;
		var f = parseInt(control.glitchpoint + (Math.random()*glitchAmount) + (Math.random()*glitchAmount) - glitchAmount, 10);

		control.showFrame(f);

	},

	showFrame: function(frame) {

		//	Now we need to work out what frame this should *really* be.
		//	As we are "bouncing a frame"
		if (frame > 172 && frame < 280) {
			frame = 172 - (frame - 172);
		} else {
			if (frame > 279 && frame < 371) {
				frame = 265 - (frame - 279);
			} else {
				if (frame > 370 && frame < 462) {
					frame = 172 + (frame - 370);
				} else {
					if (frame > 462) {
						frame = 66 - (frame - 462);
					}
				}
			}
		}

		var f = control.validFrame(frame);
		$('.cellhighlight').removeClass('cellhighlight');
		$('.cell' + f).addClass('cellhighlight');
		$('.debug').html(f);
		$('.filmstrip').css({left: f * control.screenSize.width * -1});
	},

	validFrame: function(frame) {

		//	first check to see if the frame is loaded
		if (frame in this.scenes[this.currentScene].loaded) {
			return frame;
		} else {
			do {
				frame--;
			} while (!(frame in this.scenes[this.currentScene].loaded));
			return frame;
		}

	}

};
