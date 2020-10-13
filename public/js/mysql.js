// (C) 2018-2020 Harry Dole
// Catecon:  The Categorical Console
//
var Cat = Cat || require('./Cat.js');

(function()
{
	'use strict';

	const isGUI = typeof module === 'undefined';

	const D = Cat.D;
	const R = Cat.R;
	const U = Cat.U;

	class MysqlAction extends Cat.LanguageAction
	{
		constructor(diagram)
		{
//			super(diagram, 'mysql', 'sql', typeof module === 'undefined' ? H3.text({"text-anchor":"middle", x:"160", y:"280", style:"font-size:240px;font-weight:bold;stroke:#000;"}, "SQL") : null);
			super(diagram, 'mysql', 'mysql', typeof module === 'undefined' ? H3.g([H3.text({"text-anchor":"middle", x:"160", y:"160", style:"font-size:180px;font-weight:bold;stroke:#000;"}, "My"),
												H3.text({"text-anchor":"middle", x:"160", y:"300", style:"font-size:180px;font-weight:bold;stroke:#000;"}, "SQL")]) : null);
			Cat.R.languages.set(this.basename, this);
		}
		getType(elt, first = true)
		{
			return Cat.U.Token(elt);
		}
		template(elt)
		{
			return `SELECT * FROM \`${elt.domain.basename}\`;`;
		}
		hasForm(diagram, ary)
		{
			return ary.length === 1 && ary[0] instanceof Cat.DiagramMorphism && ary[0].domain instanceof MysqlObject;
		}
	}

	class MysqlObject extends Cat.DiagramObject		// mysql table; morphisms form the columns
	{
		constructor(diagram, args)
		{
			if (!diagram.allReferences.has('hdole/mysql'))
				throw `diagram ${diagram.name} does not reference mysql`;
			const nuArgs = U.Clone(args);
			nuArgs.to = diagram.getElement(args.to);
			super(diagram, nuArgs);
			this.nuArgs = nuArgs;	// finish in postload
			this.constructor.name === 'MysqlObject' && R.EmitElementEvent(diagram, 'new', this);
		}
		postload()
		{
			this.columns = this.nuArgs.columns.slice();
			const morphisms = this.nuArgs.morphisms.map(m => this.diagram.getElement(m));
			if (morphisms.filter(m => m === undefined).length > 0)
				throw 'morphism not found for column';
			if (!Cat.Category.IsSource(morphisms))
				throw 'morphisms are not a source';
			morphisms.map(m => m.incrRefcnt());
			morphisms.map(m =>
			{
				if (!('code' in m.to))
					m.to.code = {};
				m.to.code.mysql = `SELECT ${m.to.basename} FROM ${this.to.basename};`;
			});
			this.morphisms = morphisms;
			delete this.nuArgs;
		}
		json()
		{
			const a = super.json();
			a.morphisms = this.morphisms.map(m => m.name);
			a.columns = this.columns.slice();
			return a;
		}
		decrRefcnt()
		{
			if (this.refcnt <= 1)
				this.morphisms.map(m => m.decrRefcnt());
			super.decrRefcnt();
		}
	}

	class MysqlTableAction extends Cat.Action
	{
		constructor(diagram)
		{
			const args =
			{
				description:	'Create MySQL Table',
				basename:		'mysqlTable',
				priority:		1,
			};
			super(diagram, args);
			if (!isGUI)
				return;
			this.icon = H3.g([
								H3.line({class:"arrow0", x1:"40", y1:"40", x2:"300", y2:"40", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"40", y1:"100", x2:"300", y2:"100", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"40", y1:"160", x2:"300", y2:"160", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"40", y1:"220", x2:"300", y2:"220", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"40", y1:"40", x2:"40", y2:"300", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"100", y1:"40", x2:"100", y2:"300", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"160", y1:"40", x2:"160", y2:"300", 'marker-end':"url(#arrowhead)"}),
								H3.line({class:"arrow0", x1:"220", y1:"40", x2:"220", y2:"300", 'marker-end':"url(#arrowhead)"}),
							]);
		}
		getMorphismId(m)
		{
			return `mysql-${U.Token(m)}`;
		}
		morphismRow(domain, m)
		{
			const attrs = [];
			const indexId = m.elementId('index');
//			const indexChkbox = {type:'checkbox', 'data-type':'index', id:indexId, onclick:e => e.target.previousSibling.classList.toggle('blueRow'), class:'nodisplay'};
			const indexAttrs = {class:'textButton', onclick:e => e.target.classList.toggle('blueRow')};
			if (domain instanceof MysqlObject)
			{
				const ndx = domain.morphisms.indexOf(m);
				if (ndx > -1)
				{
					attrs.push(H3.button('delete column'));
					if (domain.columns[ndx].includes('index'))
						indexAttrs.class += ' blueRow';
//						indexChkbox.checked = '';

				}
				else
					attrs.push(H3.button('add column'));
			}
			attrs.push([H3.span('Index', indexAttrs)]);
			const rowAttrs = domain.diagram.selected.includes(m) ? {class:'selRow'} : {};
			return H3.tr(H3.td(D.GetIndexHTML(m), {class:"display left"}), H3.td(attrs), rowAttrs);
		}
		columnTable(domain, morphisms)
		{
			return H3.table(morphisms.map(m => this.morphismRow(domain, m)));
		}
		html(e, diagram, ary)
		{
			const help = D.toolbar.help;
			D.RemoveChildren(help);
			const databaseName = U.Token(diagram.name);
			const elt = ary[0];
			let domain = null;
			if (elt instanceof MysqlObject)
			{
				domain = elt;
				help.appendChild(H3.h3(`Modify MySQL Table ${domain.basename}`));
				help.appendChild(this.columnTable(domain, domain.morphisms));
			}
			else if (elt.domain instanceof MysqlObject)
			{
				domain = elt.domain;
				const morphisms = domain.morphisms.slice();
				ary.map(m => !morphisms.includes(m) && morphisms.push(m));
				help.appendChild(H3.h3(`Modify MySQL Table ${domain.basename}`));
				help.appendChild(this.columnTable(domain, morphisms));
			}
			else
			{
				domain = elt.to.domain;
				help.appendChild(H3.h3(`Create MySQL Table ${domain.basename}`));
				help.appendChild(this.columnTable(domain, ary));
				help.appendChild(H3.button(`Create table ${domain.basename} in database ${diagram.name}`, {onclick:e => Cat.R.Actions.mysqlTable.action(e, diagram, diagram.selected), class:'display'}));
			}
			help.appendChild(H3.button(`Issue command for ${domain.basename} in database ${diagram.name}`, {onclick:e => Cat.R.Actions.mysqlTable.action(e, diagram, diagram.selected), class:'display'}));
		}
		action(e, diagram, ary)
		{
			const help = D.toolbar.help;
			const indexboxes = help.querySelectorAll('[type="checkbox"]');
			const indexes = new Set([...indexboxes].filter(elt => elt.checked).map(elt => elt.dataset.name));
			const domain = ary[0].domain;
			const tableName = ary[0].to.domain.basename;
			const columns = ary.map(m => [m.name, indexes.has(m.name) ? ['index'] : []]);
			if (!(domain instanceof MysqlObject))
			{
				diagram.replaceIndexObject(domain, new MysqlObject(diagram, {to:domain.to, columns, xy:domain.getXY()}));
			}
			const url = R.getURL(`mysql?command=create&diagram=${diagram.name}&table=${tableName}&columns=${JSON.stringify(columns)}`);
	console.log({url});
			const headers = {Authorization:R.cloud.accessToken};
			fetch(url, {headers}).then(response => response.text()).then(txt => console.log(txt)).catch(err => D.RecordError(err));
			R.EmitElementEvent(diagram, 'update', domain);
		}
		hasForm(diagram, ary)
		{
			const elt = ary[0];
			if (diagram.allReferences.has('hdole/mysql') && (Cat.Category.IsSource(ary) || elt instanceof Cat.DiagramMorphism || elt instanceof MysqlObject))
			{
				const domain = elt instanceof Cat.DiagramMorphism ? elt.domain : elt;
				if (domain.constructor.name !== 'DiagramObject' && !(domain instanceof MysqlObject))
					return false;
				const mysql = R.$CAT.getElement('hdole/mysql');
				return ary.reduce((r, m) => r && m.to.constructor.name === 'Morphism' && mysql.hasIndexedElement(m.to.codomain.name), true);	// all codomains are in mysql
			}
			return false;
		}
	}

	if (isGUI)
	{
		window.Cat.R.Actions.mysql = new MysqlAction(Cat.R.$Actions);
		window.Cat.R.Actions.mysqlTable = new MysqlTableAction(Cat.R.$Actions);
		window.Cat.MysqlObject = MysqlObject;
		window.Cat.MysqlAction = MysqlAction;
	}
	else
	{
		Cat.R.Actions.mysql = new MysqlAction(Cat.R.$Actions);
		Cat.MysqlObject = MysqlObject;
		Cat.MysqlAction = MysqlAction;
	}

})();	// end anon function
