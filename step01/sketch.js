const resetArray = (array) => {
	array.forEach((line, i) => {
		line.forEach((_, j) => {
			array[i][j] = 0
		})
	})
}

const sendToClipboard = (data) => {
	navigator.clipboard.writeText(data).then(
		function () {
			// console.log('SUCCESS')
		},
		function () {
			// console.log('FAILURE')
		}
	)
}

const num2str = (num, base, padding = 4) => {
	const hex = Number(num).toString(base)
	const len = padding - hex.length
	return `${new Array(len < 0 ? 0 : len).fill(0).join('')}${hex}`
}

const sprite2code = (sprite) => {
	const data = sprite.map((line) =>
		line.map((color) => {
			return Array.from(num2str(color, 2, 2)).map((a) => parseInt(a))
		})
	)

	const bits = new Array(2).fill(0).map((_, i) =>
		data.map((line) => {
			const value = parseInt(line.map((arr) => arr[i]).join(''), 2)
			return `0x${num2str(value, 16, 2)}`
		})
	)

	const transpose = (m) => {
		const values = Array.prototype.concat.apply(
			[],
			m[0].map((x, i) => {
				const arr = m.map((x) => x[i])
				arr.push(arr.shift())
				return arr
			})
		)
		const len = values.length / 2
		const result = []
		result.push(values.splice(0, len).join(', '))
		result.push(values.splice(0, len).join(', '))
		return result
	}

	return transpose(bits)
}

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

	reset() {
		this.selectedIndex = 0
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
			if (this.palette !== null) {
				this.palette.load(this.array)
			}
			this.clip()
		}
	}

	load(sprite) {
		this.array = JSON.parse(JSON.stringify(sprite))
	}

	dump() {
		console.log(JSON.stringify(this.array))
	}

	serialize() {
		const lines = sprite2code(this.array)

		const result = []
		result.push('extern const unsigned char sprite[] =')
		result.push('{')
		while (lines.length > 0) {
			result.push(`\t${lines.shift()},`)
		}
		result.push('};')

		return result.join('\n')
	}

	clip() {
		sendToClipboard(this.serialize())
	}

	reset() {
		resetArray(this.array)
		this.props.colorSelector.reset()
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

	get(sx, sy) {
		const sprite = JSON.parse(JSON.stringify(this.props.spriteEditor.array))
		sprite.forEach((line, i) => {
			line.forEach((color, j) => {
				const y = i + sy * this.props.spriteEditor.props.h
				const x = j + sx * this.props.spriteEditor.props.w
				sprite[i][j] = this.array[y][x]
			})
		})
		return sprite
	}

	select(x, y, update) {
		this.selectedX = x
		this.selectedY = y
		if (update) {
			this.props.spriteEditor.load(this.get(this.selectedX, this.selectedY))
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
			this.clip()
		}
	}

	serialize() {
		const result = []
		result.push(`#define NB_TILES ${this.props.h * this.props.w}`)
		result.push('')
		result.push('extern const unsigned char tileset[];')
		result.push('')
		result.push('extern const unsigned char tileset[] =')
		result.push('{')

		for (let y = 0; y < this.props.h; y++) {
			for (let x = 0; x < this.props.w; x++) {
				const lines = sprite2code(this.get(x, y))
				result.push(`\t${lines.join(', ')},`)
			}
		}
		result.push('};')

		return result.join('\n')
	}

	clip() {
		sendToClipboard(this.serialize())
	}

	reset() {
		resetArray(this.array)
		this.selectedX = 0
		this.selectedY = 0
		this.props.spriteEditor.reset()
		storeItem('data', JSON.stringify(this.array))
	}
}

class MapEditor {
	constructor(x, y, w, h, spritePalette) {
		const array = new Array(h).fill().map(() => new Array(w).fill().map(() => 0))
		Object.assign(this, { array, props: { x, y, w, h, spritePalette } })
		spritePalette.palette = this
	}

	draw() {
		const { props } = this
		loadPixels()

		this.array.forEach((line, i) => {
			line.forEach((sprite, j) => {
				const sj = sprite % props.spritePalette.props.w
				const si = (sprite - sj) / props.spritePalette.props.w

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
			this.clip()
		}
	}

	serialize() {
		const [a, b, c, d, ...palette] = this.props.spritePalette.serialize().split('\n')

		const lines = this.array.map((line) => line.map((value) => `0x${num2str(value, 16, 2)}`).join(', '))

		const result = []
		result.push(`${a}`)
		result.push(`${b}`)
		result.push(`#define MAP_W ${this.props.w}`)
		result.push(`#define MAP_H ${this.props.h}`)
		result.push('')
		result.push(`${c}`)
		result.push('extern const unsigned char map[];')
		result.push(`${d}`)
		result.push(`${palette.join('\n')}`)
		result.push('')
		result.push('extern const unsigned char map[] =')
		result.push('{')
		while (lines.length > 0) {
			result.push(`\t${lines.shift()},`)
		}
		result.push('};')

		return result.join('\n')
	}

	clip() {
		sendToClipboard(this.serialize())
	}

	reset() {
		resetArray(this.array)
		this.props.spritePalette.reset()
		storeItem('map', JSON.stringify(this.array))
	}
}

const colors = []
colors.push([155, 188, 15])
colors.push([139, 172, 15])
colors.push([48, 98, 48])
colors.push([15, 56, 15])

const colorSelector = new ColorSelector(10, 10, colors, 40)
const spriteEditor = new SpriteEditor(70, 10, 8, 8, 20, colorSelector)
const spritePalette = new SpritePalette(250, 10, 14, 4, 5, spriteEditor)
const mapEditor = new MapEditor(10, 190, 20, 18, spritePalette)

function setup() {
	createCanvas(820, 920)
	spritePalette.array = JSON.parse(getItem('data')) || template.data
	mapEditor.array = JSON.parse(getItem('map')) || template.map
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
	colorSelector.mouseClicked({ clientX: mouseX, clientY: mouseY })
	spriteEditor.mouseClicked({ clientX: mouseX, clientY: mouseY })
	spritePalette.mouseClicked({ clientX: mouseX, clientY: mouseY })
	mapEditor.mouseClicked({ clientX: mouseX, clientY: mouseY })
}

function mouseDragged(evt) {
	colorSelector.mouseClicked({ clientX: mouseX, clientY: mouseY })
	spriteEditor.mouseClicked({ clientX: mouseX, clientY: mouseY })
	mapEditor.mouseClicked({ clientX: mouseX, clientY: mouseY })
}

function keyPressed({ code }) {
	if (code === 'Backspace') {
		mapEditor.reset()
	}
}
