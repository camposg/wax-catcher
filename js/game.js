	var engine;
	var game;
	
	function setupCanvas(canvas) {
		var dpr = window.devicePixelRatio || 1;
		var rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		//var ctx = canvas.getContext('2d') || canvas.getContext('webgl');
		//ctx.scale(dpr, dpr);
	}
	
	async function loadNfts() {
		let response = await fetch('https://chain.wax.io/v1/chain/get_table_rows', {
			method: 'POST',
			body: JSON.stringify({json: true, code: "simpleassets", table: "sassets", scope: userAccount, limit: 500}), // Coordinate the body type with 'Content-Type'
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
			console.log(e.message);
			return null;
		}		
		return validNfts;
	}
	
	async function run() {
		let userNfts = null;
		userNfts = await loadNfts();
		console.log('nfts: ',userNfts);
		
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
		var score;
		var maxScore;
		var bottomLine;
		var lastSpawnTime = 0;
		var spawnFrequency = 1000;
		var waxCaught = 0;
		var maxWaxCaught = 0;
		var numberOfObjects = 1;

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
		}

		function create () {
			engine = this;
			ground = this.physics.add.staticGroup();
			ground.create(0, height + 10, 'ground').setScale(4).refreshBody();
			score = this.add.text(15, height - 70, '', { font: '50px Arial Bold', fill: '#FFFFFF' });
			maxScore = this.add.text(15, height - 100, '', { font: '25px Arial Bold', fill: '#999999' });
			
			var canvasElement = document.getElementsByTagName("canvas")[0];
			setupCanvas(canvasElement);
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