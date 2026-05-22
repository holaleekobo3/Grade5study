import re
import json

def extract_js_object(content, obj_name):
    # Find the start of the object
    pattern = rf"const {obj_name}\s*=\s*(\{{.*?\}});"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        js_obj = match.group(1)
        # It's not valid JSON (keys are unquoted), so we'll do some naive fixing
        # or just parse it as best as we can.
        return js_obj
    return None

def extract_js_array(content, array_name):
    pattern = rf"const {array_name}\s*=\s*(\[.*?\]);"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)
    return None

# Since python's json loader is strict, and the JS has unquoted keys, 
# let's just parse it using a more robust way: node.js script!
# Wait, let's write a node.js script to extract and generate the html, 
# it's much easier to evaluate the JS code inside Node.js!
