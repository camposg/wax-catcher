	const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
	const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
	
	var config = {
		type: Phaser.AUTO,
		width: width,
		height: height,
		 scale: {
			mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
			autoCenter: Phaser.Scale.CENTER_HORIZONTALLY 
		},
		physics: {
		default: 'arcade',
			arcade: {
				gravity: { y: 300 },
				debug: false
			}
		},
		scene: {
			preload: preload,
			create: create,
			update: update
		}
	};

	var game = new Phaser.Game(config);
	var engine;
	var score;
	var maxScore;
	var bottomLine;
	var lastSpawnTime = 0;
	var spawnFrequency = 1000;
	var waxCaught = 0;
	var maxWaxCaught = 0;

	function preload () {
		this.load.image('wax', 'assets/wax_sticker.png');
		this.load.image('ground', 'assets/ground.png');
	}

	function create () {
		engine = this;
		ground = this.physics.add.staticGroup();
		ground.create(0, height + 10, 'ground').setScale(4).refreshBody();
		score = this.add.text(15, height - 75, '', { font: '60px Arial Bold', fill: '#FFFFFF' });
		maxScore = this.add.text(15, height - 120, '', { font: '40px Arial Bold', fill: '#999999' });
	}

	function update (time) {
		var diff = time - lastSpawnTime;
		if (diff > spawnFrequency) {
		  lastSpawnTime = time;
		  if (spawnFrequency > 800) {
			spawnFrequency = spawnFrequency - 40;
		  } else if (spawnFrequency > 600) {
			spawnFrequency = spawnFrequency - 20;
		  } else if (spawnFrequency > 400) {
			spawnFrequency = spawnFrequency - 5;
		  } else if (spawnFrequency > 100) {
			spawnFrequency = spawnFrequency - 1;
		  }			  
		  spawnWax();
		}
		score.text = waxCaught;
		if (maxWaxCaught > 0) {
			maxScore.text = 'MAX: ' + maxWaxCaught;
		}
	}

	function onCaught(wax) {
		return function () {
			wax.setTint(0xffaaaa);
			wax.setVelocity(0, 0);
			waxCaught++;
			engine.time.delayedCall(250, function (wax) {
				wax.destroy();
			}, [wax], this);
		}
	}

	function gameOver(wax) {
		return function () {
			wax.setTint(0xdd5555);	
			engine.scene.pause();	
			engine.scene.resume();
			engine.time.delayedCall(100, function (wax) {
				if (maxWaxCaught < waxCaught) {
					maxWaxCaught = waxCaught;
				}
				waxCaught = 0;
				spawnFrequency = 1000;
				engine.scene.restart();	
			}, [wax], this);
		}
	}

	function spawnWax() {
		var wax;
		var x = Phaser.Math.Between(100, width - 100);
		var y = -100;
		wax = engine.physics.add.image(x, y, 'wax');
		wax.setDisplaySize(width * height * 0.00012, width * height * 0.00012);
		var extraSpeed = 0;
		if ((height - width) > 0) {
			extraSpeed = (height - width) / 1.5;
		}
		wax.setVelocity(0, 200 + extraSpeed);
		wax.setInteractive();
		wax.on('pointerdown', onCaught(wax), this);
		engine.physics.add.collider(wax, ground, gameOver(wax), null, this);
	}