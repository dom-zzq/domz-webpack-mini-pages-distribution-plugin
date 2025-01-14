const path = require('path');
const fs = require('fs');
const excelJS = require('exceljs');

class GeneratePagesDistributionPlugin {
	constructor(options) {
		this.options = options || {};
		let outputFileType = this.options.outputFileType || 'all';
		// handle output list
		if (outputFileType === 'all') {
			outputFileType = ['excel', 'md']; // excel md txt
		} else {
			outputFileType = [outputFileType];
		}
		this.outputFileType = outputFileType;
		this.dataType = this.options.dataType || 'array';
	}

	apply(compiler) {
		compiler.hooks.emit.tapAsync('GeneratePagesDistributionPlugin', this.hooksHandle());
	}

	hooksHandle(compilation, callback) {
		try {
			// project structure
			// const projectRoot = process.cwd();
			// let structurStr = this.getDirectoryStructure(projectRoot); // JSON.stringify(directoryStructure, null, 2);
			// let fileList = `${structurStr}`;
			// const fileList2 = Object.keys(compilation.assets).join('\n');

			// pages structure
			const pagesJsonContent = fs.readFileSync(this.options.inputFile, 'utf-8');
			const pagesJson = JSON.parse(pagesJsonContent);

			let rootPages = [...this.processPages(pagesJson.pages, this.dataType || 'array'), ...this.processSubPackages(pagesJson.subPackages, this.dataType || 'array')];
			let dirContents = [
				{
					root: 0,
					pages: rootPages,
					style: { navigationBarTitleText: this.options.rootProjectName || 'WeChat-Mini-Program' },
				},
			];
			let fileList = this.getJSONStructure(dirContents);
			const content = `${fileList}`;

			// console.log(33336, compiler.options.output.path, outputDir, outputPath);
			this.outputFileType.forEach((item) => {
				if (item === 'excel') {
					this.createExcelFile(rootPages);
				} else {
					this.createTxtFile(content, item);
				}
			});

			callback && callback();
		} catch (e) {
			console.log('err', e);
			callback && callback();
		}
	}

	createTxtFile(content, fileSuffixName = 'txt') {
		if (!content) return;
		const fileName = this.options.fileName || 'structure';
		const fullFileName = `${fileName}.${fileSuffixName}`;

		const outputDir = this.options.outputPath || `${path.join(process.cwd(), 'dist')}`;
		const outputPath = this.options.outputPath ? `${path.join(outputDir, fullFileName)}` : path.join(compiler.options.output.path, fullFileName);

		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// file io output
		fs.writeFileSync(outputPath, content);
	}

	createExcelFile(content) {
		if (!content) return;
		const workbook = new excelJS.Workbook();
		const sheet = workbook.addWorksheet('Sheet1');

		const fileName = this.options.fileName || 'structure';
		const fullFileName = `${fileName}.xlsx`;

		const outputDir = this.options.outputPath || `${path.join(process.cwd(), 'dist')}`;
		const outputPath = this.options.outputPath ? `${path.join(outputDir, fullFileName)}` : path.join(compiler.options.output.path, fullFileName);

		sheet.columns = [
			{ header: '主子包名称', key: 'package', width: 50 },
			{ header: '菜单路径', key: 'path', width: 70 },
			{ header: '菜单名称', key: 'name', width: 70 },
		];
		let firstRow = sheet.getRow(1);
		firstRow.height = 25;
		firstRow.eachCell((cell) => {
			cell.alignment = { horizontal: 'center', vertical: 'middle' };
			cell.font = { bold: true, size: 11 };
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'D8D8D8' },
				bgColor: { argb: 'D8D8D8' }
			}
			cell.border = {
				top: { style: 'thin', color: { argb: '000000' } },
				left: { style: 'thin', color: { argb: '000000' } },
				bottom: { style: 'thin', color: { argb: '000000' } },
				right: { style: 'thin', color: { argb: '000000' } }
			};
		});

		switch (this.dataType) {
			case 'tree': // need to merge cells
				this.mergeCellsForCreateExcel(sheet, content);
				break
			default:
				content.forEach((item, idx) => {
					let navigationBarTitleText = item.style || {};
					navigationBarTitleText = navigationBarTitleText.navigationBarTitleText || '';
					const itemName = `${navigationBarTitleText || ''}`;

					sheet.addRow({ id: idx + 1, package: ' ', path: item.path, name: itemName || '' });
				})
				break
		}

		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		workbook.xlsx.writeFile(outputPath)
			.then(() => {
				console.log('Excel 文件生成成功，保存到:', outputPath);
			})
			.catch((err) => {
				console.error('生成 Excel 文件时出错:', err);
			});
	}

	// mergeCells
	mergeCellsForCreateExcel(sheet, tree, startRow = 1) {
		let currentRow = startRow;

		tree.forEach((item) => {
			if (!item.root) {
				let navigationBarTitleText = item.style || {};
				navigationBarTitleText = navigationBarTitleText.navigationBarTitleText || '';
				const itemName = `${item.root ? item.root : navigationBarTitleText || ''}`;
				// console.log(111, itemName, item.path, item)

				const row = sheet.addRow({ path: item.path, name: itemName, package: ' ', id: 1 });
				row.getCell('path').alignment = { horizontal: 'left', vertical: 'middle' };
				row.getCell('name').alignment = { horizontal: 'left', vertical: 'middle' };
			}

			if (item.pages && item.pages.length) {
				const childStartRow = currentRow + 1;
				this.mergeCellsForCreateExcel(sheet, item.pages, childStartRow);
				const childEndRow = sheet.rowCount;

				// merge
				sheet.mergeCells(`A${childStartRow}:A${childEndRow}`);
				sheet.getCell(`A${childStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
				sheet.getCell(`A${childStartRow}`).font = { bold: true, size: 12 };
				sheet.getCell(`A${childStartRow}`).value = item.root || '';


				currentRow = childEndRow;
			} else {
				currentRow++;
			}
		});

		return currentRow;
	}


	// project structure
	getJSONStructure(dirContents, indent = '') {
		let structure = '';
		dirContents.forEach((item, index) => {
			const isLast = index === dirContents.length - 1;
			const itemPath = item.pages || [];
			let navigationBarTitleText = item.style || {};
			navigationBarTitleText = navigationBarTitleText.navigationBarTitleText || '';
			const itemName = `${item.root ? item.root : item.path || ''}${(item.root || item.root === 0) || !navigationBarTitleText ? "" : ":"}${item.root ? `(${item.pages && item.pages.length || 0})` : navigationBarTitleText || ''}`;

			const prefix = isLast ? '└── ' : '├── ';
			structure += `${indent}${prefix}${itemName}\n`;

			if (item.pages instanceof Array) {
				const childIndent = indent + (isLast ? '    ' : '│   ');
				structure += this.getJSONStructure(itemPath, childIndent);
			}
		});
		return structure;
	}

	// 递归获取目录结构
	getDirectoryStructure(directory, indent = '') {
		let structure = '';
		const dirContents = fs.readdirSync(directory, { withFileTypes: true });

		dirContents.forEach((item, index) => {
			const isLast = index === dirContents.length - 1;
			const itemPath = path.join(directory, item.name);
			const itemName = item.name;

			// 忽略 node_modules 目录
			if (['node_modules', '.git', 'dist'].includes(itemName)) return;

			const prefix = isLast ? '└── ' : '├── ';
			structure += `${indent}${prefix}${itemName}\n`;

			if (item.isDirectory()) {
				const childIndent = indent + (isLast ? '    ' : '│   ');
				structure += this.getDirectoryStructure(itemPath, childIndent);
			}
		});

		return structure;
	}

	// subPages2TreeOrFlatArray
	processSubPackages(subPackages, type = 'tree') {
		let subPages = [];
		subPackages.forEach((subPackage) => {
			subPackage.pages.forEach((page) => {
				page.path = `${subPackage.root}/${page.path}`;
			});
			subPages = subPages.concat(subPackage.pages);
		});
		if (type !== 'tree') return subPages;
		return subPackages;
	}

	// mainPages2TreeOrFlatArray
	processPages(pages = [], type = 'tree') {
		if (type === 'tree') return [{
			root: 'pages',
			pages
		}];
		return pages || [];
	}

}

module.exports = GeneratePagesDistributionPlugin;