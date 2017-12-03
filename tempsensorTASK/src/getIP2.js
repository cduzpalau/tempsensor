require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    console.log('addr: '+add);
  })