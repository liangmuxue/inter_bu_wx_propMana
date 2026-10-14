const patrolRefImage = require('../../utils/patrol-ref-image');



Component({

  properties: {

    itemId: { type: String, value: '' },

    itemName: { type: String, value: '' },

    refImage: { type: Object, value: null },

    inline: { type: Boolean, value: false }

  },



  data: {

    displayRef: null

  },



  lifetimes: {

    attached: function () {

      this.syncDisplayRef();

    }

  },



  observers: {

    'itemId, itemName, refImage': function () {

      this.syncDisplayRef();

    }

  },



  methods: {

    syncDisplayRef: function () {

      const passed = this.properties.refImage;

      if (passed && passed.itemId) {

        this.setData({ displayRef: passed });

        return;

      }

      const itemId = this.properties.itemId;

      const itemName = this.properties.itemName;

      this.setData({ displayRef: patrolRefImage.resolve(itemId, itemName) });

    }

  }

});

