---
to: src/<%=h.changeCase.paramCase(h.inflection.pluralize(name))%>/dto/create-<%=h.changeCase.paramCase(h.inflection.singularize(name))%>.dto.ts
---
<% single = h.changeCase.camel(h.inflection.singularize(name)) -%>
<% Single = h.changeCase.pascalCase(single) -%>
<% plural = h.changeCase.camel(h.inflection.pluralize(name)) -%>
<% Plural = h.changeCase.pascalCase(plural) -%>
export class Create<%=Single%>Dto {
}
