import { readdir, writeFile } from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface Geometry {
	format_version: "1.12.0";
	"minecraft:geometry": [
		{
			description: {
				identifier: string;
				texture_width: number;
				texture_height: number;
				visible_bounds_width: number;
				visible_bounds_height: number;
				visible_bounds_offset: [number, number, number];
			};
			bones: GeometryBone[];
		},
	];
}

interface GeometryBone {
	name: string;
	pivot: [number, number, number];
	cubes: GeometryBoneCube[];
}

interface GeometryBoneCube {
	origin: [number, number, number];
	size: [number, number, number];
	uv: {
		north?: { uv: [number, number]; uv_size: [number, number] };
		south?: { uv: [number, number]; uv_size: [number, number] };
		east?: { uv: [number, number]; uv_size: [number, number] };
		west?: { uv: [number, number]; uv_size: [number, number] };
		up?: { uv: [number, number]; uv_size: [number, number] };
		down?: { uv: [number, number]; uv_size: [number, number] };
	};
}

const args: string[] = process.argv.slice(2);
const input = args[0] as string;
const output = args[1] as string;
const amount: number = +(args[2] || Infinity);

readdir(input, {}, async (_, files) => {
	let i = 1;

	for (const file of files) {
		const fileName = path.basename(file as string, ".png");

		const { data, info } = await sharp(path.join(input, file as string))
			.raw()
			.toBuffer({ resolveWithObject: true });
		const { width, height, channels } = info;

		if (i++ > amount) return;

		const cubes: GeometryBoneCube[] = [];
		const geo: Geometry = {
			format_version: "1.12.0",
			"minecraft:geometry": [
				{
					description: {
						identifier: "geometry." + fileName,
						texture_height: height,
						texture_width: width,
						visible_bounds_height: 4,
						visible_bounds_width: 4,
						visible_bounds_offset: [0, 0, 0],
					},
					bones: [
						{
							name: "root",
							pivot: [0, 0, 0],
							cubes: cubes,
						},
					],
				},
			],
		};

		function isAlpha(x: number, y: number): boolean {
			const idx = (y * width + x) * channels;
			const alpha = channels === 4 ? data[idx + 3] : 255;

			if (alpha === undefined) return true;
			if (alpha === 0) return true;
			return false;
		}

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * channels;
				const alpha = channels === 4 ? data[idx + 3] : 255;

				if (alpha === undefined) throw new Error("Went outside of image");
				if (alpha === 0) continue;

				const cube: GeometryBoneCube = {
					origin: [x - width / 2, -y + height, 0],
					size: [1, 1, 1],
					uv: {
						north: { uv: [x, y], uv_size: [1, 1] },
						south: { uv: [x, y], uv_size: [1, 1] },
					},
				};

				if (isAlpha(x, y - 1)) cube.uv.up = { uv: [x, y], uv_size: [1, 1] };
				if (isAlpha(x, y + 1)) cube.uv.down = { uv: [x, y], uv_size: [1, 1] };
				if (isAlpha(x - 1, y)) cube.uv.east = { uv: [x, y], uv_size: [1, 1] };
				if (isAlpha(x + 1, y)) cube.uv.west = { uv: [x, y], uv_size: [1, 1] };

				cubes.push(cube);
			}
		}

		const outpath = path.join(output, fileName) + ".geo.json";

		console.log(file, outpath);

		writeFile(outpath, JSON.stringify(geo), {}, (e) => {
			if (e) console.warn(e);
		});
	}
});

console.log(input, output);
