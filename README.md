## What can i use for ?
a webpack plugin to create image for introducing pages distribution

### How to use in webpack
    plugins: [
        new webpackPluginRouteDistribution({
            rootProjectName: 'your project name',
            fileName: 'pagesDistribution',
            dataType: 'array', // tree|array
            inputFile: path.join(__dirname, '/src/pages.json'),
            outputPath: path.join(process.cwd(), 'dist'),
            outputFileType: 'txt', // default=all|excel|txt
        })
    ]

### How to use in Node
    let test = new GeneratePagesDistributionPlugin({
        rootProjectName: 'xxx小程序',
        fileName: 'pagesDistribution',
        dataType: 'tree', // tree|array
        inputFile: path.join(__dirname, 'pages.json'),
        outputPath: path.join(process.cwd(), 'dist'),
        outputFileType: 'all', // default=all|excel|txt
    })
    test.hooksHandle()