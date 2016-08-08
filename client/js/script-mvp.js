const
  mainEl = '.blogs-list',
  create = Object.create,
  assign = Object.assign;

var symID = Symbol('id');
symID = 0;

const
  Model = {
    author: '',
    title: '',
    url: '',
    setup( options = {} ) {
      if ( typeof options !== 'object'
          || options == null
        ) options = {};

      const
        model = create( this );

      Object.defineProperty(
        model,
        'subscribers',
        {
          value: [],
          enumerable: false
        }
      );

      assign( model, options );

      model.keys = [ 'author', 'title', 'url' ];

      const
        set = function ( target, key, val, context ) {
          Reflect.set( ...arguments );

          model.subscribers.forEach(presenter => {  
            presenter.notify( key, val, presenter.ID );
          });

          return true;
        },
        handler = { set },
        proxy = new Proxy( model, handler );

      return proxy;
    },
    fetch( resolve, rej ) {
      jQuery.get(`api/blogs/${ this._id || '' }`, res => {
        res.forEach(( obj, idx ) => {
          assign( this, obj );
          resolve( obj );
        });   
      });
    },
    save( res, rej ) {
      jQuery.ajax({
        type: this._id ? 'PUT' : 'POST',
        url: `api/blogs/${ ( this._id || '' ) }`,
        data: JSON.stringify( this ),
        dataType: 'json',
        contentType: 'application/json',
        success: function ( obj ) {
          res( obj );
        },
        error: rej
      });
    },
    destroy( res, rej ) {
      jQuery.ajax({
        type: 'DELETE',
        url: `/api/blogs/${ this._id }`,
        dataType: 'json',
        success: res,
        error: rej
      });
    },
    addSubscriber( presenter ) {
      this.subscribers.push( presenter );
      return this;
    }
  };

const
  View = {
    tag: 'TR',
    setup(opts = {}) {
      var
        view = create( this ),
        el = view.elem = $(`<${ this.tag }>`),
        CLASS, ID;

      if ( CLASS = view.className )
        el.attr('class', CLASS);
      if ( ID = view.id )
        el.attr('id', ID);

      const
        eventHandler = function ( type ) {
          const
            media = [ 'edit', 'update', 'delete', 'add', 'cancel' ],
            length = media.length;

          var callback = null;

          if ( type == 'ON' )
            callback = e => {
              return this.presenter.handle( e.target.className );
            };

          for ( let i = 0; i < length; i++ ) {
            let
              str = ( i >= length - 1 ? '' : '-blog' ),
              button = el.find('.' + media[ i ] + str);

            button[ type.toLowerCase() ]('click', callback);
          }
        };

      view.registerEvents = eventHandler.bind( view, 'ON' );
      view.unregisterEvents = eventHandler.bind( view, 'OFF' );

      return assign( view, opts );
    },
    render( data ) {
      var
        compiler = _.template(
          $( this.template ).html()
        ),
        html = compiler( data );

      this.unregisterEvents();
      this.elem.html( html );
      this.registerEvents();

      $( this.wrapper ).append( this.elem );

      return this;
    },
    get: function ( selector, tag = 'input' ) {
      if ( selector == null || typeof selector === 'number')
        throw TypeError('Invalid selector!');

      if ( typeof tag !== 'string' ||
            ( typeof tag === 'string' &&
              !( tag = tag.toLowerCase() ).match( /input|text/g )
            )
          )
        throw TypeError('tag should be either input or text');

      let
        el = this.elem,
        elem = el.find('.' + selector)[ 0 ] || el.find('#' + selector)[ 0 ];

      if ( !elem )
        throw TypeError('No such selector exists in the view!');

      if ( tag === 'input' )
        return $( elem ).val();
      else return $( elem ).text();
    },
    set: function ( selector, text, tag = 'html' ) {
      var length = arguments.length;

      if ( length <= 1 )
        throw TypeError('At least 2 arguments are required!');

      tag = ( tag === 'html' || tag === 'val' ) ? tag : 'html';

      if ( selector == null || typeof selector === 'number' )
        throw TypeError('invalid selector!');

      var elem = $( '.' + selector )[ 0 ] || $( '#' + selector )[ 0 ];

      if ( !elem )
        throw TypeError('no such selector exists!');

      $( elem )[ tag ]( text );
    },
    remove() {
      this.elem.remove();
    }
  };

const
  Presenter = {
    setup( opts = {} ) {
      const obj = create( this );
      
      this.ID = Symbol.for('presenterID');

      obj[ this.ID ] = symID++;

      obj.view = View.setup({
        template: opts.template || '.blog-list-template',
        wrapper: opts.wrapper || '.blogs-list'
      });

      const
        presenter = assign( obj, opts ),
        model = presenter.model || {},
        el = presenter.view.render( model ).elem;

      if ( model && Model.isPrototypeOf( model ) )
        model.addSubscriber( obj );

      obj.view.presenter = presenter;

      return presenter;
    },
    edit() {
      this.view.template = '.blog-editor-template';
      this.view.render( this.model );
    },
    remove() {
      this.view.remove();

      this.model.destroy(
        () => { console.log('Correctelly deleted'); },
        () => { console.log('Something went wrong!'); }
      );
    },
    update() {
      const model = this.model;

      this.view.template = '.blog-list-template';

      model.keys.forEach(( prop, idx ) => {
        model[ prop ] = this.view.get( prop );
      });

      this.view.render( model );

      model.save(
        () => { console.log('Successfuly saved model'); },
        () => { console.log('Something bad happend!'); }
      );
    },
    cancel() {
      this.view.template = '.blog-list-template';
      this.view.render( this.model );
    },
    add() {
      const
        view = this.view,
        author = view.get('author'),
        title = view.get('title'),
        url = view.get('url');

      const
        model = Model.setup({
          author: author,
          title: title,
          url: url
        });

      model.save(
        obj => {
          let presenter = Presenter.setup({
            model: assign( model, obj )
          });
          console.log('Succesfully saved model!');
        },
        () => { console.log('error: saving model!'); }
      );

      view.set( 'author', '', 'val');
      view.set( 'title', '', 'val');
      view.set( 'url', '', 'val');
    },
    handle( className ) {
      switch ( className.split(' ')[ 2 ] ) {
        case 'edit-blog':
          this.edit();
          break;
        case 'delete-blog':
          this.remove();
          break;
        case 'update-blog':
          this.update();
          break;
        case 'add-blog':
          this.add();
          break;
        case 'cancel':
          this.cancel();
          break;
      }
    },
    notify( key, val, id ) {
      const view = this.view;

      if ( this.ID == id )
        return;

      switch ( key ) {
        case 'author':
          view.set('author', val);
          break;
        case 'title':
          view.set('title', val);
          break;
        case 'url':
          view.set('url', val);
          break;
      }
    }
  };

$( document ).ready(() => {
  const
    load = function () {
      Model.fetch(( res ) => {
        Presenter.setup({
          model: Model.setup( res )
        });
      });
    };

  const
    presenter = Presenter.setup({
      template: '.user-options-template',
      wrapper: '.blogs-actions'
    });

  load();
});
