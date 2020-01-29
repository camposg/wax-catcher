	var engine;
	var game;

	
	async function loadNfts() {
		let response = await fetch('https://chain.wax.io/v1/chain/get_table_rows', {
			method: 'POST',
			body: JSON.stringify({json: true, code: "simpleassets", table: "sassets", scope: userAccount, reverse: true, limit: 500}),
		});
		let data = await response.json();
		try {
			var validNfts = [];
			validNfts = data.rows.map((nftsData) => {
				if (nftsData.author === 'waxgamesnfts') {		
					nftsData.mdata = JSON.parse(nftsData.mdata);
					return (nftsData);
				}
			});
			var validNfts = validNfts.filter(Boolean);
		} catch (e) {
			//console.log(e.message);
		}	

		while (data.more == true) {
			let lastItemId = data.rows[data.rows.length - 1].id;
			response = await fetch('https://chain.wax.io/v1/chain/get_table_rows', {
				method: 'POST',
				body: JSON.stringify({json: true, code: "simpleassets", table: "sassets", scope: userAccount, reverse: true, limit: 500, upper_bound: parseInt(lastItemId) - 1}),
			});
			data = await response.json();		
			try {
				var validNftsExtra = [];
				validNftsExtra = data.rows.map((nftsData) => {
					if (nftsData.author === 'waxgamesnfts') {		
						nftsData.mdata = JSON.parse(nftsData.mdata);
						return (nftsData);
					}
				});
				validNftsExtra = validNftsExtra.filter(Boolean);
				validNfts = [...validNfts, ...validNftsExtra];
			} catch (e) {
				//console.log(e.message);
			}	
		}
		
		document.getElementById("loading").style.display = "none";	
		//console.log(validNfts);
		return validNfts;
	}
	
	async function run() {
		let userNfts = null;
		userNfts = await loadNfts();
		
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

		game = new Phaser.Game(config);
		let score;
		let maxScore;
		let bottomLine;
		let lastSpawnTime = 0;
		let spawnFrequency = 1000;
		let waxCaught = 0;	
		let maxWaxCaught = 0;
		let waxSpawned = 0;
		let numberOfObjects = 1;
		let emitterBlue;
		let emitterRed;
		let caughtSound;
		let gameOverSound;

		function preload () {	
			if (userNfts && userNfts.length > 0) {
				for(var i=0; i < userNfts.length; i++) {
					this.load.image('object_'+ (i+1), 'https://cloudflare-ipfs.com/ipfs/'+userNfts[i].mdata.img);
				}
				numberOfObjects = userNfts.length;
			} else {
				this.load.image('object_1', 'assets/wax_sticker.png');
			}				
			this.load.image('ground', 'assets/ground.png');			
			this.cameras.main.backgroundColor.setTo(6,5,10);		
			
			// particles
			this.load.image('spark0', 'assets/particles/blue.png');
			this.load.image('spark1', 'assets/particles/red.png');
			
			// sound
			this.load.audio('caughtSound', 'assets/audio/blaster.mp3', {
				instances: 1
			});
			this.load.audio('gameOverSound', 'assets/audio/explosion.mp3', {
				instances: 1
			});
			
		}

		function create () {
			engine = this;
			ground = this.physics.add.staticGroup();
			ground.create(0, height + 10, 'ground').setScale(4).refreshBody();
			score = this.add.text(15, height - 70, '', { font: '50px Arial Bold', fill: '#FFFFFF' });
			maxScore = this.add.text(15, height - 100, '', { font: '25px Arial Bold', fill: '#999999' });
			caughtSound = this.sound.add('caughtSound', {volume: 0.03});		
			gameOverSound = this.sound.add('gameOverSound', {volume: 0.03});
			emitterBlue = this.add.particles('spark0').createEmitter({
				x: 0,
				y: 0,
				speed: { min: -800, max: 800 },
				angle: { min: 0, max: 360 },
				scale: { start: 0.5, end: 0 },
				blendMode: 'SCREEN',
				//active: false,
				lifespan: 600,
				gravityY: 800,
				visible: false
			});
			emitterRed = this.add.particles('spark1').createEmitter({
				x: 0,
				y: 0,
				speed: { min: -800, max: 800 },
				angle: { min: 0, max: 360 },
				scale: { start: 0.3, end: 0 },
				blendMode: 'SCREEN',
				//active: false,
				lifespan: 300,
				gravityY: 800,
				visible: false
			});
			emitterBlue.explode();
			emitterRed.explode();
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
				caughtSound.play();
				emitterBlue.setPosition(wax.x, wax.y);
				emitterRed.setPosition(wax.x, wax.y);			
				emitterBlue.explode(30);
				emitterRed.explode(30);
				emitterBlue.visible = true;
				emitterRed.visible = true;
				wax.setVelocity(0, 0);
				waxCaught++;
				engine.time.delayedCall(160, function (wax) {
					wax.destroy();
				}, [wax], this);
			}
		}

		function gameOver(wax) {
			return function () {
				gameOverSound.play();
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
			waxSpawned++;
			var wax;
			var object = Phaser.Math.Between(1, numberOfObjects);
			var x = Phaser.Math.Between(100, width - 100);
			var y = -100;
			wax = engine.physics.add.image(x, y, 'object_'+object);
			var sizeWidth = width * height * 0.00012;
			var sizeHeight = width * height * 0.00012;
			if (sizeWidth < 100) {
				sizeWidth = 100;
			}
			if (sizeHeight < 100) {
				sizeHeight = 100;
			}
			wax.setDisplaySize(sizeWidth, sizeHeight);
			wax.setDepth(99999999999 - waxSpawned);
			var extraSpeed = 0;
			if ((height - width) > 0) {
				extraSpeed = (height - width) / 10;
				console.log(extraSpeed);
			}
			wax.setVelocity(0, 200 + extraSpeed);
			wax.setInteractive();
			wax.on('pointerdown', onCaught(wax), this);
			engine.physics.add.collider(wax, ground, gameOver(wax), null, this);
		}
	}