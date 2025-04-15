import re
from collections import defaultdict

def normalize_command(cmd):
    """Normalize command name for comparison"""
    return cmd.strip().lower()

def categorize_commands(commands):
    """Categorize commands into patterns"""
    categories = defaultdict(list)

    # Common prefixes to categorize by
    prefixes = {
        'wp_': 'WP',
        'sql_': 'SQL',
        'dom_': 'DOM',
        'sax_': 'SAX',
        'listbox_': 'LISTBOX',
        'object_': 'OBJECT',
        'form_': 'FORM',
        'blob_': 'BLOB',
        'web_': 'WEB',
    }

    # Single word commands go here
    single_word = []
    # Multi-word commands without specific prefix go here
    generic_multi = []

    for cmd in commands:
        normalized = normalize_command(cmd)

        # Check if it matches any prefix pattern
        matched = False
        for prefix, category in prefixes.items():
            if normalized.startswith(prefix.lower()):
                categories[category].append(cmd)
                matched = True
                break

        if not matched:
            if ' ' in normalized:
                generic_multi.append(cmd)
            else:
                single_word.append(cmd)

    return dict(categories), single_word, generic_multi

def generate_grammar(commands):
    """Generate the grammar rules"""
    categories, single_word, generic_multi = categorize_commands(commands)

    output = []

    # Main command rule
    output.append("    _command: $ => choice(")
    output.append("      // Categorized commands")
    for category in categories:
        output.append(f"      $.__{category.lower()}_commands,")
    output.append("      // Generic multi-word commands")
    output.append("      $.__generic_multi_word_commands,")
    output.append("      // Single word commands")
    output.append("      $.__single_word_commands")
    output.append("    ),\n")

    # Generate category rules
    for category, cmds in categories.items():
        output.append(f"    __{category.lower()}_commands: $ => token(prec(PREC.SPECIFIC_COMMAND, choice(")
        for cmd in sorted(cmds):
            output.append(f"      /{create_case_insensitive_pattern(cmd)}/,")
        output.append("    ))),\n")

    # Generate generic multi-word rule
    if generic_multi:
        output.append("    __generic_multi_word_commands: $ => token(prec(PREC.GENERIC_COMMAND, choice(")
        for cmd in sorted(generic_multi):
            output.append(f"      /{create_case_insensitive_pattern(cmd)}/,")
        output.append("    ))),\n")

    # Generate single word rule
    if single_word:
        output.append("    __single_word_commands: $ => token(prec(PREC.GENERIC_COMMAND,")
        output.append("      /(?:" + "|".join(sorted(single_word)) + ")[A-Za-z0-9_]*/i")
        output.append("    ),\n")

    return "\n".join(output)

def create_case_insensitive_pattern(cmd):
    """Create a case-insensitive regex pattern for a command"""
    pattern = ""
    for char in cmd:
        if char.isalpha():
            pattern += f"[{char.lower()}{char.upper()}]"
        elif char.isspace():
            pattern += "\\s+"
        else:
            pattern += re.escape(char)
    return pattern

# Example usage:
if __name__ == "__main__":
    # Read commands from file
    with open("4d_commands.txt", "r") as f:
        commands = [line.strip() for line in f if line.strip()]

    # Generate grammar
    grammar = generate_grammar(commands)

    # Write to output file
    with open("command_grammar.js", "w") as f:
        f.write(grammar)
