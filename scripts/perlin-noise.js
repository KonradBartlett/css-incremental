/**
 * Perlin Noise and Flowing Field Generator in Native JavaScript
 */

function fade(t) {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t, a, b) {
	return a + t * (b - a);
}

function grad3D(hash, x, y, z) {
	const h = hash & 15;
	const u = h < 8 ? x : y;
	const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
	return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

class PerlinNoise {
	/**
	 * @param {Function} [random] - Optional custom random function
	 */
	constructor(random = Math.random) {
		this.p = new Int32Array(512);
		this.shuffle(random);
	}

	/**
	 * Shuffles the permutation table to generate new random noise.
	 * @param {Function} [random=Math.random]
	 */
	shuffle(random = Math.random) {
		const permutation = Array.from({ length: 256 }, (_, i) => i);
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			const temp = permutation[i];
			permutation[i] = permutation[j];
			permutation[j] = temp;
		}
		for (let i = 0; i < 256; i++) {
			this.p[i] = permutation[i];
			this.p[256 + i] = permutation[i];
		}
	}

	/**
	 * Generates a 3D Perlin noise value for coordinates (x, y, z)
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {number} Noise value roughly in the range [-0.866, 0.866]
	 */
	noise3D(x, y, z) {
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;
		const Z = Math.floor(z) & 255;

		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);
		const zf = z - Math.floor(z);

		const u = fade(xf);
		const v = fade(yf);
		const w = fade(zf);

		const A = this.p[X] + Y;
		const AA = this.p[A] + Z;
		const AB = this.p[A + 1] + Z;
		const B = this.p[X + 1] + Y;
		const BA = this.p[B] + Z;
		const BB = this.p[B + 1] + Z;

		return lerp(
			w,
			lerp(
				v,
				lerp(u, grad3D(this.p[AA], xf, yf, zf), grad3D(this.p[BA], xf - 1, yf, zf)),
				lerp(
					u,
					grad3D(this.p[AB], xf, yf - 1, zf),
					grad3D(this.p[BB], xf - 1, yf - 1, zf),
				),
			),
			lerp(
				v,
				lerp(
					u,
					grad3D(this.p[AA + 1], xf, yf, zf - 1),
					grad3D(this.p[BA + 1], xf - 1, yf, zf - 1),
				),
				lerp(
					u,
					grad3D(this.p[AB + 1], xf, yf - 1, zf - 1),
					grad3D(this.p[BB + 1], xf - 1, yf - 1, zf - 1),
				),
			),
		);
	}

	/**
	 * Generates fractal Brownian motion noise (FBM) with multiple octaves.
	 */
	fbm3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
		let total = 0;
		let frequency = 1.0;
		let amplitude = 1.0;
		let maxValue = 0;

		for (let i = 0; i < octaves; i++) {
			total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
			maxValue += amplitude;
			amplitude *= persistence;
			frequency *= lacunarity;
		}

		return total / maxValue;
	}
}

// Shared instance; world.js reseeds it from the saved world seed.
let perlin = new PerlinNoise();

/**
 * Generates a 2D grid of values between 0 and 100 based on Perlin noise.
 *
 * @param {number} width - Number of columns
 * @param {number} height - Number of rows
 * @param {Object} [options] - Options for generation
 * @param {number} [options.scale=0.1] - Spatial scaling factor for noise inputs
 * @param {number} [options.z=0.0] - Z-coordinate (used for time / animation step)
 * @param {number} [options.octaves=1] - Number of noise octaves for fractal details
 * @param {boolean} [options.round=true] - Whether to round the returned values to integers
 * @returns {number[][]} A 2D array of dimensions [height][width] with values in [0, 100]
 */
function generateNoiseGrid(width, height, options = {}) {
	const scale = options.scale !== undefined ? options.scale : 0.1;
	const z = options.z !== undefined ? options.z : 0.0;
	const octaves = options.octaves !== undefined ? options.octaves : 1;
	const round = options.round !== undefined ? options.round : true;

	const grid = [];
	for (let r = 0; r < height; r++) {
		const row = [];
		for (let c = 0; c < width; c++) {
			// Calculate raw noise value
			let rawNoise;
			if (octaves > 1) {
				rawNoise = perlin.fbm3D(c * scale, r * scale, z, octaves);
			} else {
				rawNoise = perlin.noise3D(c * scale, r * scale, z);
			}

			// 3D noise values mathematically range roughly between -0.866 and 0.866.
			// Normalize rawNoise from [-0.866, 0.866] to [0, 1]
			const clamped = Math.max(-0.866, Math.min(0.866, rawNoise));
			const normalized = (clamped + 0.866) / (2 * 0.866);

			// Scale to [0, 100]
			let val = normalized * 100;

			// Keep strictly within [0, 100]
			val = Math.max(0, Math.min(100, val));

			if (round) {
				val = Math.round(val);
			}

			row.push(val);
		}
		grid.push(row);
	}
	return grid;
}

