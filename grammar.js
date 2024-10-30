const PREC = {
  LOWEST: -4,
  COMMENT: -3,
  KEYWORD: -2,
  OPERATOR: -1,
  BASE: 0,
  DECLARATION: 1,
  EXPRESSION: 2,
  MEMBER: 3,
  CALL: 4,
  PRIMARY: 5
}

module.exports = grammar({
  name: 'fourd',

  rules: {
    source: $ => repeat($._statement),

    _statement: $ => choice(
      $.comment,
      $._block,
      $._declaration,
      $._expression
    ),

    // Comments
    comment: $ => choice(
      seq(
        '//',
        /[^\n]*/
      ),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '*/'
      )
    ),

    // Blocks
    _block: $ => choice(
      $.for_each_block,
      $.while_block,
      $.repeat_block,
      $.if_block,
      $.for_block,
      $.use_block,
      $.sql_block,
      $.case_block,
      $.declare_block
    ),

    // Declarations
    _declaration: $ => choice(
      $.var_declaration,
      $.function_declaration,
      $.class_declaration,
      $.property_declaration,
      $.alias_declaration
    ),

    // Expressions
    _expression: $ => prec.left(PREC.EXPRESSION, choice(
      $.assignment,
      $.binary_operation,
      $.ternary_operation,
      $.method_call,
      $.value
    )),

    // Common patterns
    _identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    _variable: $ => choice(
      $.local_variable,
      $.process_variable,
      $.interprocess_variable
    ),

    local_variable: $ => seq('$', $._identifier),
    process_variable: $ => $._identifier,
    interprocess_variable: $ => seq('<>', $._identifier),

    for_each_block: $ => seq(
      choice($.FOR_EACH, $.POUR_CHAQUE),
      $.parameter_list,
      optional(seq(
        choice($.WHILE, $.UNTIL, $.JUSQUE, $.TANT_QUE),
        $.condition
      )),
      repeat($._statement),
      choice($.END_FOR_EACH, $.FIN_DE_CHAQUE)
    ),

    declare_block: $ => prec.left(PREC.DECLARATION, seq(
      $.DECLARE,
      $.parameter_list,
      optional($.return_declaration)
    )),

    while_block: $ => seq(
      choice($.WHILE, $.TANT_QUE),
      $.condition,
      repeat($._statement),
      choice($.END_WHILE, $.FIN_TANT_QUE)
    ),

    // Declarations
    var_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.VAR,
      $._variable,
      optional(seq(
        ':', $._type
      ))
    )),

    // Types
    _type: $ => choice(
      $.basic_type,
      $.class_type
    ),

    basic_type: $ => choice(
      'Text',
      'Date',
      'Time',
      'Boolean',
      'Integer',
      'Real',
      'Pointer',
      'Picture',
      'BLOB',
      'Collection',
      'Variant',
      'Object'
    ),

    class_type: $ => seq(
      choice('4D', 'ds', 'cs'),
      '.',
      $._identifier
    ),

    // Block structures
    while_block: $ => seq(
      choice($.WHILE, $.TANT_QUE),
      $.condition,
      repeat($._statement),
      choice($.END_WHILE, $.FIN_TANT_QUE)
    ),

    repeat_block: $ => seq(
      choice($.REPEAT, $.REPETER),
      repeat($._statement),
      seq(choice($.UNTIL, $.JUSQUE), $.condition)
    ),

    if_block: $ => seq(
      $.IF,
      $.condition,
      repeat($._statement),
      optional(seq(
        choice($.ELSE, $.SINON),
        repeat($._statement)
      )),
      $.END_IF
    ),

    case_block: $ => seq(
      choice($.CASE_OF, $.AU_CAS_OU),
      repeat(seq(
        $.case_condition,
        repeat($._statement)
      )),
      optional(seq(
        choice($.ELSE, $.SINON),
        repeat($._statement)
      )),
      choice($.END_CASE, $.FIN_DE_CAS)
    ),

    for_block: $ => seq(
      choice($.FOR, $.POUR),
      $.parameter_list,
      $.condition,
      repeat($._statement),
      choice($.END_FOR, $.FIN_POUR)
    ),

    use_block: $ => seq(
      choice($.USE, $.UTILISER),
      $.parameter_list,
      repeat($._statement),
      choice($.END_USE, $.FIN_UTILISER)
    ),

    sql_block: $ => seq(
      choice($.BEGIN_SQL, $.DEBUT_SQL),
      repeat($._statement),
      choice($.END_SQL, $.FIN_SQL)
    ),

    // Function and method declarations
    function_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.FUNCTION,
      $._identifier,
      optional($.parameter_list),
      optional($.return_declaration),
      repeat($._statement)
    )),

    // Class-related structures
    class_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.CLASS,
      optional(seq($.EXTENDS, $._identifier)),
      repeat(choice(
        $.property_declaration,
        $.constructor_declaration,
        $.function_declaration
      ))
    )),

    constructor_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.CLASS,
      $.CONSTRUCTOR,
      optional($.parameter_list),
      repeat($._statement)
    )),

    property_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.PROPERTY,
      $._identifier,
      ':',
      $._type
    )),

    alias_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.ALIAS,
      $._identifier,
      $._identifier
    )),

    // Expressions
    assignment: $ => prec.left(PREC.EXPRESSION, seq(
      $.value,
      ':=',
      $.value
    )),

    binary_operation: $ => prec.left(PREC.OPERATOR, seq(
      $.value,
      $._operator,
      $.value
    )),

    ternary_operation: $ => prec.right(PREC.OPERATOR, seq(
      $.condition,
      '?',
      $.value,
      ':',
      $.value
    )),

    method_call: $ => prec.left(PREC.CALL, seq(
      choice(
        $._identifier,
      ),
      $.argument_list,
    )),

    case_condition: $ => seq(
      ':',
      $.condition
    ),

    // Values and literals
    value: $ => choice(
      $.number,
      $.string,
      $.date,
      $.time,
      $.boolean,
      $._variable,
      $.method_call,
      $.object_access,
      $.array_access
    ),

    number: $ => choice(
      $._integer,
      $._decimal,
      $._hex,
      $._scientific
    ),

    _integer: $ => /[0-9]+/,
    _decimal: $ => /[0-9]+\.[0-9]+/,
    _hex: $ => /0[xX][0-9a-fA-F]+/,
    _scientific: $ => /[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+/,

    string: $ => /"[^"]*"/,

    date: $ => choice(
      seq('!', /[0-9]{1,2}/, '-', /[0-9]{1,2}/, '-', /[0-9]{1,2}/, '!'),
      seq('!', /[0-9]{1,2}/, '/', /[0-9]{1,2}/, '/', /[0-9]{1,2}/, '!'),
      seq('!', /[0-9]{1,2}/, '.', /[0-9]{1,2}/, '.', /[0-9]{1,2}/, '!')
    ),

    time: $ => seq('?', /[0-9]{1,2}/, ':', /[0-9]{1,2}/, ':', /[0-9]{1,2}/, '?'),

    boolean: $ => choice(
      'True',
      'False'
    ),

    // Operators
    _operator: $ => choice(
      '+', '-', '*', '/', '%',
      '=', '#', '<', '>', '<=', '>=',
      '&', '|', '^',
      ':=', '+=', '-=', '*=', '/=',
      '??', '?-', '?+'
    ),

    // Keywords
    FOR_EACH: $ => prec(PREC.KEYWORD, /[Ff][Oo][Rr]\s+[Ee][Aa][Cc][Hh]/),
    POUR_CHAQUE: $ => prec(PREC.KEYWORD, /[Pp][Oo][Uu][Rr]\s+[Cc][Hh][Aa][Qq][Uu][Ee]/),
    FOR: $ => prec(PREC.KEYWORD, /[Ff][Oo][Rr]/),
    POUR: $ => prec(PREC.KEYWORD, /[Pp][Oo][Uu][Rr]/),
    WHILE: $ => prec(PREC.KEYWORD, /[Ww][Hh][Ii][Ll][Ee]/),
    TANT_QUE: $ => prec(PREC.KEYWORD, /[Tt][Aa][Nn][Tt]\s+[Qq][Uu][Ee]/),
    JUSQUE: $ => prec(PREC.KEYWORD, /[Jj][Uu][Ss][Qq][Ue]/),
    END_WHILE: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Ww][Hh][Ii][Ll][Ee]/),
    FIN_TANT_QUE: $ => prec(PREC.KEYWORD, /[Ff][Ii][Nn]\s+[Tt][Aa][Nn][Tt]\s+[Qq][Uu][Ee]/),
    REPEAT: $ => prec(PREC.KEYWORD, /[Rr][Ee][Pp][Ee][Aa][Tt]/),
    REPETER: $ => prec(PREC.KEYWORD, /[Rr][Ee][Pp][Ee][Tt][Ee][Rr]/),
    IF: $ => prec(PREC.KEYWORD, /[Ii][Ff]/),
    END_IF: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Ii][Ff]/),
    ELSE: $ => prec(PREC.KEYWORD, /[Ee][Ll][Ss][Ee]/),
    SINON: $ => prec(PREC.KEYWORD, /[Ss][Ii][Nn][Oo][Nn]/),
    FUNCTION: $ => prec(PREC.KEYWORD, /[Ff][Uu][Nn][Cc][Tt][Ii][Oo][Nn]/),
    CLASS: $ => prec(PREC.KEYWORD, /[Cc][Ll][Aa][Ss][Ss]/),
    CONSTRUCTOR: $ => prec(PREC.KEYWORD, /[Cc][Oo][Nn][Ss][Tt][Rr][Uu][Cc][Tt][Oo][Rr]/),
    EXTENDS: $ => prec(PREC.KEYWORD, /[Ee][Xx][Tt][Ee][Nn][Dd][Ss]/),
    USE: $ => prec(PREC.KEYWORD, /[Uu][Ss][Ee]/),
    UTILISER: $ => prec(PREC.KEYWORD, /[Uu][Tt][Ii][Ll][Ii][Ss][Ee][Rr]/),
    END_USE: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Uu][Ss][Ee]/),
    FIN_UTILISER: $ => prec(PREC.KEYWORD, /[Ff][Ii][Nn]\s+[Uu][Tt][Ii][Ll][Ii][Ss][Ee][Rr]/),
    END_FOR: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Ff][Oo][Rr]/),
    FIN_POUR: $ => prec(PREC.KEYWORD, /[Ff][Ii][Nn]\s+[Pp][Oo][Uu][Rr]/),
    END_FOR_EACH: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Ff][Oo][Rr]\s+[Ee][Aa][Cc][Hh]/),
    FIN_DE_CHAQUE: $ => prec(PREC.KEYWORD, /[Ff][Ii][Nn]\s+[Dd][Ee]\s+[Cc][Hh][Aa][Qq][Uu][Ee]/),
    BEGIN_SQL: $ => prec(PREC.KEYWORD, /[Bb][Ee][Gg][Ii][Nn]\s+[Ss][Qq][Ll]/),
    DEBUT_SQL: $ => prec(PREC.KEYWORD, /[Dd][Ee][Bb][Uu][Tt]\s+[Ss][Qq][Ll]/),
    END_SQL: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Ss][Qq][Ll]/),
    FIN_SQL: $ => prec(PREC.KEYWORD, /[Ff][Ii][Nn]\s+[Ss][Qq][Ll]/),
    DECLARE: $ => prec(PREC.KEYWORD, /[Dd][Ee][Cc][Ll][Aa][Rr][Ee]/),
    VAR: $ => prec(PREC.KEYWORD, /[Vv][Aa][Rr]/),
    ALIAS: $ => prec(PREC.KEYWORD, /[Aa][Ll][Ii][Aa][Ss]/),
    UNTIL: $ => prec(PREC.KEYWORD, /[Uu][Nn][Tt][Ii][Ll]/),
    JUSQUE: $ => prec(PREC.KEYWORD, /[Jj][Uu][Ss][Qq][Ue]/),
    CASE_OF: $ => prec(PREC.KEYWORD, /[Cc][Aa][Ss][Ee]\s+[Oo][Ff]/),
    AU_CAS_OU: $ => prec(PREC.KEYWORD, /[Aa][Uu]\s+[Cc][Aa][Ss]\s+[Oo][Uu]/),
    END_CASE: $ => prec(PREC.KEYWORD, /[Ee][Nn][Dd]\s+[Cc][Aa][Ss][Ee]/),
    FIN_DE_CAS: $ => prec(PREC.KEYWORD, /[Ff][Ii][Nn]\s+[Dd][Ee]\s+[Cc][Aa][Ss]/),
    PROPERTY: $ => prec(PREC.KEYWORD, /[Pp][Rr][Oo][Pp][Ee][Rr][Tt][Yy]/),

    // Helper rules
    condition: $ => choice(
      $.value,
      $.binary_operation,
      seq('(', $._expression, ')')
    ),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        $.parameter,
        optional(repeat(seq(';', $.parameter)))
      )),
      ')'
    ),

    parameter: $ => prec.left(PREC.DECLARATION, seq(
      $.value,
      optional(seq(
        ':',
        $._type
      ))
    )),

    return_declaration: $ => prec.left(PREC.DECLARATION, seq(
      optional(seq(
        '->',
        $.local_variable
      )),
      ':',
      $._type
    )),

    argument_list: $ => seq(
      '(',
      optional(seq(
        $.value,
        repeat(seq(';', $.value))
      )),
      ')'
    ),

    property_access: $ => seq(
      '.',
      $._identifier
    ),

    object_access: $ => prec.left(PREC.MEMBER, seq(
      $.value,
      repeat1($.property_access)
    )),

    array_access: $ => prec.left(PREC.MEMBER, seq(
      $.value,
      '[',
      $.value,
      ']'
    )),
  }
});
