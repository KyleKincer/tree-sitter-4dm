const PREC = {
  LOWEST: -4,
  COMMENT: -3,
  OPERATOR: -2,
  BASE: -1,
  VALUE: 0,
  EXPRESSION: 1,
  CONDITION: 2,
  MEMBER: 3,
  CALL: 4,
  DECLARATION: 5,
  KEYWORD: 6
}

function ci(keyword) {
  return new RegExp(
    keyword
      .split('')
      .map(char => {
        if (/[a-zA-Z]/.test(char)) {
          return `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        if (/\s/.test(char)) {
          return `\\s+`;
        }
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('')
  );
}


module.exports = grammar({
  name: 'fourd',

  rules: {
    source: $ => repeat($._statement),

    _statement: $ => choice(
      $.comment,
      prec(PREC.KEYWORD, $._block),
      $._declaration,
      prec.left(PREC.BASE, $._expression)
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
      $.c_declaration
    ),

    // Modern VAR syntax
    var_declaration: $ => prec.left(PREC.DECLARATION, seq(
      $.VAR,
      $.variable_list,
      optional(seq(':', $._type))
    )),

    // Classic C_* syntax
    c_declaration: $ => prec.left(PREC.DECLARATION, seq(
      choice(
        'C_TEXT',
        'C_LONGINT',
        'C_REAL',
        'C_DATE',
        'C_TIME',
        'C_BOOLEAN',
        'C_BLOB',
        'C_OBJECT',
        'C_COLLECTION',
        'C_VARIANT',
        'C_POINTER',
        'C_PICTURE'
      ),
      '(',
      $._variable,
      ')'
    )),

    // List of variables separated by semicolons
    variable_list: $ => seq(
      $._variable,
      repeat(seq(
        ';',
        $._variable
      ))
    ),

    // Variables can be local, process, or interprocess
    _variable: $ => choice(
      $.local_variable,
      $.process_variable,
      $.interprocess_variable
    ),

    // Expressions
    _expression: $ => prec.left(PREC.EXPRESSION, choice(
      // Operations that produce a new value
      $.assignment_expression,     // a := b
      $.binary_expression,        // a + b, a > b, a && b
      $.ternary_expression,       // a ? b : c
      $.parenthesized_expression, // (a)
      // Atomic expressions
      $.value,                    // Keep using existing value rule for now
      $.object_chain,            // Form.sys
      $.function_call            // method()
    )),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // Common patterns
    _identifier: $ => choice(
      prec.left(PREC.LOWEST, /[A-Za-z_][A-Za-z0-9_]*/),
    ),

    local_variable: $ => seq('$', $._identifier),
    process_variable: $ => $._identifier,
    interprocess_variable: $ => seq('<>', $._identifier),

    // Block structures
    for_block: $ => prec.left(PREC.KEYWORD, seq(
      $.FOR,
      $.parameter_list,
      repeat($._statement),
      $.END_FOR
    )),

    for_each_block: $ => prec.left(PREC.KEYWORD, seq(
      $.FOR_EACH,
      $.parameter_list,
      optional(seq(
        choice($.WHILE, $.UNTIL),
        $.parenthesized_expression
      )),
      repeat($._statement),
      $.END_FOR_EACH
    )),

    declare_block: $ => prec.left(PREC.KEYWORD, seq(
      '#',
      $.DECLARE,
      $.parameter_list,
      optional($.return_declaration)
    )),

    while_block: $ => seq(
      $.WHILE,
      $._block_condition,
      repeat($._statement),
      $.END_WHILE
    ),

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
    repeat_block: $ => seq(
      $.REPEAT,
      repeat($._statement),
      seq($.UNTIL, $.parenthesized_expression)
    ),

    if_block: $ => seq(
      $.IF,
      $._block_condition,
      repeat($._statement),
      optional(seq(
        $.ELSE,
        repeat($._statement)
      )),
      $.END_IF
    ),

    case_block: $ => seq(
      $.CASE_OF,
      repeat(seq(
        ':',
        $._block_condition,
        repeat($._statement)
      )),
      optional(seq(
        $.ELSE,
        repeat($._statement)
      )),
      $.END_CASE
    ),

    use_block: $ => prec.left(PREC.KEYWORD, seq(
      $.USE,
      $.parameter_list,
      repeat($._statement),
      $.END_USE
    )),

    sql_block: $ => prec.left(PREC.KEYWORD, seq(
      $.BEGIN_SQL,
      repeat($._statement),
      $.END_SQL
    )),

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
    assignment_expression: $ => prec.right(PREC.EXPRESSION, seq(
      $.value,
      ':=',
      $.value
    )),

    binary_expression: $ => prec.left(PREC.OPERATOR, seq(
      $._expression,
      choice(
        // Arithmetic
        '+', '-', '*', '/', '%',
        // Comparison
        '=', '#', '<', '>', '<=', '>=',
        // Logical
        '&', '|', '^', '&&', '||'
      ),
      $._expression
    )),

    ternary_expression: $ => prec.right(PREC.CONDITION, seq(
      $._expression,
      '?',
      $._expression,
      ':',
      $._expression
    )),

    function_call: $ => prec.left(PREC.CALL, choice(
      // Direct function call
      seq(
        field('name', $._identifier),
        $.argument_list
      ),
      // Method call on object chain
      seq(
        field('object', $.object_chain),
        $.argument_list
      )
    )),

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
    _operator: $ => prec.left(PREC.OPERATOR, choice(
      '+', '-', '*', '/', '%',
      '=', '#', '<', '>', '<=', '>=',
      '&', '|', '^',
      '+=', '-=', '*=', '/=',
      '??', '?-', '?+'
    )),

    // Keywords
    FOR_EACH: $ => prec(PREC.KEYWORD, choice($._FOR_EACH, $._POUR_CHAQUE)),
    _FOR_EACH: $ => ci('for each'),
    _POUR_CHAQUE: $ => ci('pour chaque'),

    END_FOR_EACH: $ => prec(PREC.KEYWORD, choice($._END_FOR_EACH, $.FIN_DE_CHAQUE)),
    _END_FOR_EACH: $ => ci('end for each'),
    FIN_DE_CHAQUE: $ => ci('fin de chaque'),

    UNTIL: $ => prec(PREC.KEYWORD, choice($._UNTIL, $._JUSQUE)),
    _UNTIL: $ => ci('until '),
    _JUSQUE: $ => ci('jusque '),

    FOR: $ => prec(PREC.KEYWORD, choice($._FOR, $._BOUCLE)),
    _FOR: $ => ci('for '),
    _BOUCLE: $ => ci('boucle '),

    END_FOR: $ => prec(PREC.KEYWORD, choice($._END_FOR, $.FIN_DE_BOUCLE)),
    _END_FOR: $ => ci('end for'),
    FIN_DE_BOUCLE: $ => ci('fin de boucle'),

    WHILE: $ => prec(PREC.KEYWORD, choice($._WHILE, $._TANT_QUE)),
    _WHILE: $ => ci('while '),
    _TANT_QUE: $ => ci('tant que'),

    END_WHILE: $ => prec(PREC.KEYWORD, choice($._END_WHILE, $.FIN_TANT_QUE)),
    _END_WHILE: $ => ci('end while'),
    FIN_TANT_QUE: $ => ci('fin tant que'),

    REPEAT: $ => prec(PREC.KEYWORD, choice($._REPEAT, $._REPETER)),
    _REPEAT: $ => ci('repeat '),
    _REPETER: $ => ci('repeter '),

    IF: $ => prec(PREC.KEYWORD, choice($._IF, $._SI)),
    _IF: $ => ci('if '),
    _SI: $ => ci('si '),

    END_IF: $ => prec(PREC.KEYWORD, choice($._END_IF, $.FIN_SI)),
    _END_IF: $ => ci('end if'),
    FIN_SI: $ => ci('fin si'),

    ELSE: $ => prec(PREC.KEYWORD, choice($._ELSE, $._SINON)),
    _ELSE: $ => ci('else '),
    _SINON: $ => ci('sinon '),

    CASE_OF: $ => prec(PREC.KEYWORD, choice($._CASE_OF, $._AU_CAS_OU)),
    _CASE_OF: $ => ci('case of'),
    _AU_CAS_OU: $ => ci('au cas ou'),

    END_CASE: $ => prec(PREC.KEYWORD, choice($._END_CASE, $.FIN_DE_CAS)),
    _END_CASE: $ => ci('end case'),
    FIN_DE_CAS: $ => ci('fin de cas'),

    USE: $ => prec(PREC.KEYWORD, choice($._USE, $._UTILISER)),
    _USE: $ => ci('use '),
    _UTILISER: $ => ci('utiliser '),

    END_USE: $ => prec(PREC.KEYWORD, choice($._END_USE, $.FIN_UTILISER)),
    _END_USE: $ => ci('end use'),
    FIN_UTILISER: $ => ci('fin utiliser'),

    BEGIN_SQL: $ => prec(PREC.KEYWORD, choice($._BEGIN_SQL, $.DEBUT_SQL)),
    _BEGIN_SQL: $ => ci('begin sql'),
    DEBUT_SQL: $ => ci('debut sql'),

    END_SQL: $ => prec(PREC.KEYWORD, choice($._END_SQL, $.FIN_SQL)),
    _END_SQL: $ => ci('end sql'),
    FIN_SQL: $ => ci('fin sql'),

    FUNCTION: $ => prec(PREC.KEYWORD, ci('function ')),
    CLASS: $ => prec(PREC.KEYWORD, ci('class ')),
    CONSTRUCTOR: $ => prec(PREC.KEYWORD, ci('constructor ')),
    EXTENDS: $ => prec(PREC.KEYWORD, ci('extends ')),
    DECLARE: $ => prec(PREC.KEYWORD, ci('declare ')),
    VAR: $ => prec(PREC.KEYWORD, ci('var ')),
    ALIAS: $ => prec(PREC.KEYWORD, ci('alias ')),
    PROPERTY: $ => prec(PREC.KEYWORD, ci('property ')),

    object_chain: $ => prec.left(PREC.MEMBER, seq(
      choice($.process_variable, $.local_variable),
      repeat1($.property_access)
    )),

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

    // Base value without object access
    _base_value: $ => choice(
      $.number,
      $.string,
      $.date,
      $.time,
      $.boolean,
      $._variable,
      $._command,
      $.function_call
    ),

    // Value that can include object access
    value: $ => prec.left(PREC.VALUE, choice(
      $._base_value,
      $.object_chain,
      $.array_access
    )),

    // Object chain (like Form.sys or Form.sys.terminated)
    object_chain: $ => prec.left(PREC.MEMBER, seq(
      choice($.process_variable, $.local_variable),
      repeat1($.property_access)
    )),

    // Property access (.something)
    property_access: $ => seq(
      '.',
      $._identifier
    ),

    // Function call
    function_call: $ => prec.left(PREC.CALL, choice(
      // Direct function call
      seq(
        field('name', $._identifier),
        $.argument_list
      ),
      // Method call on object chain
      seq(
        field('object', $.object_chain),
        $.argument_list
      )
    )),

    _block_condition: $ => prec.left(PREC.EXPRESSION, choice(
      $.parenthesized_expression,
      prec.left(PREC.OPERATOR, seq(
        $.parenthesized_expression,
        choice('|', '||', '&', '&&'),
        $.parenthesized_expression
      ))
    )),

    // Allow spaces in command names
    _command: $ => /[A-Za-z][A-Za-z0-9 _]*[A-Za-z0-9_]/,
  }
});
