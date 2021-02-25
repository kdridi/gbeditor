class ColorSelector {
	constructor(x, y, colors, s) {
		Object.assign(this, { selectedIndex: 0, props: { x, y, colors, s } })
	}

	draw() {
		const { props } = this
		push()
		translate(props.x, props.y)

		strokeWeight(1)
		stroke(0)
		props.colors.forEach(([r, g, b], index) => {
			fill(r, g, b)
			rect(0, index * props.s, props.s, props.s)
		})

		strokeWeight(5)
		stroke(255)
		const [r, g, b] = props.colors[this.selectedIndex]
		fill(r, g, b)
		rect(0, this.selectedIndex * props.s, props.s, props.s)

		pop()
	}

	mouseClicked(evt) {
		const { props } = this
		const { clientX, clientY } = evt
		const x = Math.floor((clientX - props.x) / props.s)
		const y = Math.floor((clientY - props.y) / props.s)
		if (0 <= x && x < 1 && 0 <= y && y < props.colors.length) {
			this.selectedIndex = y
		}
	}

	colorAt(index) {
		return this.props.colors[index]
	}
}

class SpriteEditor {
	constructor(x, y, w, h, s, colorSelector) {
		const array = new Array(h).fill().map(() => new Array(w).fill().map(() => 0))
		Object.assign(this, { palette: null, array, props: { x, y, w, h, s, colorSelector } })
	}

	draw() {
		const { props } = this
		push()
		translate(props.x, props.y)
		this.array.forEach((line, y) => {
			line.forEach((color, x) => {
				const [r, g, b] = props.colorSelector.colorAt(color)
				fill(r, g, b)
				rect(x * props.s, y * props.s, props.s, props.s)
			})
		})
		pop()
	}

	mouseClicked(evt) {
		const { props } = this
		const { clientX, clientY } = evt
		const x = Math.floor((clientX - props.x) / props.s)
		const y = Math.floor((clientY - props.y) / props.s)
		if (0 <= x && x < props.w && 0 <= y && y < props.h) {
			this.array[y][x] = props.colorSelector.selectedIndex
		}
		if (this.palette !== null) {
			this.palette.load(this.array)
		}
	}

	load(sprite) {
		this.array = JSON.parse(JSON.stringify(sprite))
	}

	dump() {
		console.log(JSON.stringify(this.array))
	}
}

class SpritePalette {
	constructor(x, y, w, h, s, spriteEditor) {
		const array = new Array(h * spriteEditor.props.h).fill().map(() => new Array(w * spriteEditor.props.w).fill().map(() => 0))
		Object.assign(this, { selectedX: 0, selectedY: 0, array, props: { x, y, w, h, s, spriteEditor } })
		spriteEditor.palette = this
	}

	draw() {
		const { props } = this
		push()
		translate(props.x, props.y)
		noStroke()
		this.array.forEach((line, y) => {
			line.forEach((color, x) => {
				const [r, g, b] = props.spriteEditor.props.colorSelector.colorAt(color)
				fill(r, g, b)
				rect(x * props.s, y * props.s, props.s, props.s)
			})
		})
		pop()
	}

	select(x, y, update) {
		this.selectedX = x
		this.selectedY = y
		if (update) {
			const sprite = JSON.parse(JSON.stringify(this.props.spriteEditor.array))
			sprite.forEach((line, i) => {
				line.forEach((color, j) => {
					const y = i + this.selectedY * this.props.spriteEditor.props.h
					const x = j + this.selectedX * this.props.spriteEditor.props.w
					sprite[i][j] = this.array[y][x]
				})
			})
			this.props.spriteEditor.load(sprite)
		}
	}

	load(sprite) {
		sprite.forEach((line, i) => {
			line.forEach((color, j) => {
				const y = i + this.selectedY * this.props.spriteEditor.props.h
				const x = j + this.selectedX * this.props.spriteEditor.props.w
				this.array[y][x] = color
			})
		})
	}

	mouseClicked(evt) {
		storeItem('data', JSON.stringify(this.array))
		const { props } = this
		const { clientX, clientY } = evt
		const x = Math.floor((clientX - props.x) / (props.s * this.props.spriteEditor.props.w))
		const y = Math.floor((clientY - props.y) / (props.s * this.props.spriteEditor.props.h))
		if (0 <= x && x < props.w && 0 <= y && y < props.h) {
			this.select(x, y, true)
		}
	}
}

class MapEditor {
	constructor(x, y, w, h, spritePalette) {
		const array = new Array(h).fill().map(() => new Array(w).fill().map(() => 0))
		Object.assign(this, { selectedX: 0, selectedY: 0, array, props: { x, y, w, h, spritePalette } })
		spritePalette.palette = this
	}

	draw() {
		const { props } = this
		loadPixels()

		this.array.forEach((line, i) => {
			line.forEach((sprite, j) => {
				const sj = sprite % props.spritePalette.props.w
				const si = sprite - sj

				const sw = props.spritePalette.props.s * props.spritePalette.props.spriteEditor.props.w
				const sh = props.spritePalette.props.s * props.spritePalette.props.spriteEditor.props.h

				const sx = props.spritePalette.props.x + sw * sj
				const sy = props.spritePalette.props.y + sh * si

				const px = props.x + sw * j
				const py = props.y + sh * i

				for (let y = 0; y < sh; y++) {
					for (let x = 0; x < sw; x++) {
						for (let z = 0; z < 4; z++) {
							const color = pixels[((sy + y) * width + (sx + x)) * 4 + z]
							pixels[((py + y) * width + (px + x)) * 4 + z] = color
						}
					}
				}
			})
		})
		updatePixels()
	}

	mouseClicked(evt) {
		storeItem('map', JSON.stringify(this.array))
		const { props } = this
		const { clientX, clientY } = evt

		const sw = props.spritePalette.props.s * props.spritePalette.props.spriteEditor.props.w
		const sh = props.spritePalette.props.s * props.spritePalette.props.spriteEditor.props.h

		const x = Math.floor((clientX - props.x) / sw)
		const y = Math.floor((clientY - props.y) / sh)
		if (0 <= x && x < props.w && 0 <= y && y < props.h) {
			this.array[y][x] = props.spritePalette.selectedX + props.spritePalette.selectedY * props.spritePalette.props.w
		}
	}
}

// const sprite = []
// sprite.push([0, 3, 3, 3, 3, 3, 3, 0])
// sprite.push([3, 0, 0, 0, 0, 0, 0, 3])
// sprite.push([3, 0, 3, 0, 0, 3, 0, 3])
// sprite.push([3, 0, 0, 0, 0, 0, 0, 3])
// sprite.push([3, 0, 0, 0, 0, 0, 0, 3])
// sprite.push([3, 0, 3, 3, 3, 3, 0, 3])
// sprite.push([3, 0, 0, 0, 0, 0, 0, 3])
// sprite.push([0, 3, 3, 3, 3, 3, 3, 0])

const colors = []
colors.push([155, 188, 15])
colors.push([139, 172, 15])
colors.push([48, 98, 48])
colors.push([15, 56, 15])

const colorSelector = new ColorSelector(10, 10, colors, 40)

const spriteEditor = new SpriteEditor(70, 10, 8, 8, 20, colorSelector)
// spriteEditor.load(sprite)

const spritePalette = new SpritePalette(250, 10, 14, 4, 5, spriteEditor)

const mapEditor = new MapEditor(10, 190, 20, 18, spritePalette)

function setup() {
	createCanvas(820, 920)
	const data = JSON.parse(getItem('data'))
	if (data !== null) {
		spritePalette.array = data
	}
	const map = JSON.parse(getItem('map'))
	if (map !== null) {
		mapEditor.array = map
	}
	frameRate(10)
	spritePalette.select(0, 0, true)
	pixelDensity(1)
}

function draw() {
	background(0)
	colorSelector.draw()
	spriteEditor.draw()
	spritePalette.draw()
	mapEditor.draw()
}

function mouseClicked(evt) {
	colorSelector.mouseClicked(evt)
	spriteEditor.mouseClicked(evt)
	spritePalette.mouseClicked(evt)
	mapEditor.mouseClicked(evt)
}

function mouseDragged(evt) {
	colorSelector.mouseClicked(evt)
	spriteEditor.mouseClicked(evt)
	mapEditor.mouseClicked(evt)
}

function keyPressed(evt) {
	console.log(evt)
	if (evt.code === 'KeyD') {
		spriteEditor.dump()
	}
}
