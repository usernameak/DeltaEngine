Program = (Component / Behavior)+
Component = _ "component" __ name:Identifier _ "(" _ args:(argname:Identifier _ {return argname})* ")" _ behavesas:("behavesas" behavesas:(__ behavesas:Identifier "(" _ bargs:Value* ")" {
  return {
  name: behavesas,
    args: bargs
    }
})+ {
  return behavesas
})? _ "{"
    _ subcomponents:(scname:Identifier _ "(" _ scargs:Value* ")" _ {
      return {
      name: scname,
            args: scargs
    }
    })*
"}" _ {
  return {
        type: "Component",
        name: name,
        args: args,
        subcomponents: subcomponents,
        behavesas: behavesas ? behavesas : []
    }
}
Behavior = _ "behavior" __ name:Identifier _ "(" _ args:(argname:Identifier _ {return argname})* ")" _ triggeredby:("triggeredby" __ triggeredby:Identifier {
  return triggeredby
})? _ "{" expr:(ExprList / Expr / ArrayExpr) "}" _ {
  return {
      type: "Behavior",
        name: name,
        args: args,
        expr: expr,
        triggeredby: triggeredby ? triggeredby : "tick"
    }
}
ExprList = expr1:(Expr / ArrayExpr) expro:(Expr / ArrayExpr)+ {
  return {
      type: "Expr",
        funcName: "do",
        arg: [expr1].concat(expro)
    }
}
Expr = _ funcName:FuncName _ "(" _ arg:Value ")" _ {
  return {
      type: "Expr",
        funcName: funcName,
        arg: arg
    }
}
ArrayExpr = _ funcName: FuncName _ "(" _ value1:Value value2:Value+ ")" _ {
  return {
      type: "Expr",
        funcName: funcName,
        arg: [value1].concat(value2)
    }
}
Value = val:(ArrayExpr / Expr / Void / String / Array / Number / VarName) _ {return val}
Void = "void" {return null}
String = "\"" str:(EscapeSequence / !('"' / "\n") symbol:. {return symbol})* "\"" {return str.join("")}
EscapeSequence = '\\' char:("'"
                  / '"'
                  / "\\"
                  / "b"  { return "\b"; }
                  / "f"  { return "\f"; }
                  / "n"  { return "\n"; }
                  / "r"  { return "\r"; }
                  / "t"  { return "\t"; }
                  / "v"  { return "\v"; }) {return char}
Array = "[" Value* "]"
Number = num:$("0" / [1-9][0-9]*) {return parseInt(num)}
Identifier = $([A-Za-z_$][A-Za-z0-9$]*)
VarName = name:Identifier {
  return {
      type: "Expr",
        funcName: "varget",
        arg: name
    }
}
FuncName = Identifier
_ = [ \r\n\t]*
__ = [ \r\n\t]+