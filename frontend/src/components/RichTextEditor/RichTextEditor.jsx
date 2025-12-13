import React, { useRef, useEffect, useState } from 'react';
import { FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaFont, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './RichTextEditor.css';

const RichTextEditor = ({ value, onChange, placeholder = 'Start typing...', onGrammarErrors, glossaryTerms = [], grammarErrors = [], onGlossaryTermClick }) => {
  const editorRef = useRef(null);
  const [fontSize, setFontSize] = useState('16px');
  const [glossaryTooltip, setGlossaryTooltip] = useState(null);
  const [grammarTooltip, setGrammarTooltip] = useState(null);
  const decorateTimerRef = useRef(null);
  const handlersAttachedRef = useRef(false);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      // Only update if content is significantly different to avoid cursor jumping
      // Simple check: if value is empty and editor is empty, don't reset
      if (value === '' && editorRef.current.innerHTML === '<br>') return;
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          insertTextAtCursor(finalTranscript + ' ');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const savedRangeRef = useRef(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    } else if (editorRef.current) {
      // Fallback: focus and move to end
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const insertTextAtCursor = (text) => {
    restoreSelection();
    // Try execCommand first as it handles undo stack
    const success = document.execCommand('insertText', false, text);

    // Fallback if execCommand fails (though restoreSelection should help)
    if (!success && editorRef.current) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      } else {
        editorRef.current.innerText += text;
      }
    }
    handleContentChange();
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    } else {
      saveSelection(); // Save cursor position before focus moves to button
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    const root = editorRef.current;
    if (!root || handlersAttachedRef.current) return;
    root.addEventListener('mousemove', onMouseMove, { passive: true });
    root.addEventListener('mouseleave', onMouseLeave, { passive: true });
    root.addEventListener('click', onClick, false);
    handlersAttachedRef.current = true;
    return () => {
      if (!root) return;
      root.removeEventListener('mousemove', onMouseMove);
      root.removeEventListener('mouseleave', onMouseLeave);
      root.removeEventListener('click', onClick);
      handlersAttachedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (decorateTimerRef.current) {
      clearTimeout(decorateTimerRef.current);
    }
    decorateTimerRef.current = setTimeout(() => {
      removeDecorations();
      applyGlossaryDecorations();
      applyGrammarDecorations();
    }, 500);
    return () => {
      if (decorateTimerRef.current) {
        clearTimeout(decorateTimerRef.current);
      }
    };
  }, [value, glossaryTerms, grammarErrors]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const content = stripDecorations(editorRef.current.innerHTML);
      onChange(content);
    }
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value + 'px';
    setFontSize(size);
    execCommand('fontSize', '7'); // Use arbitrary size
    // Apply font size to selection
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      try {
        range.surroundContents(span);
      } catch (e) {
        // If surroundContents fails, apply to entire content
        if (editorRef.current) {
          editorRef.current.style.fontSize = size;
        }
      }
    }
    handleContentChange();
  };

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const stripDecorations = (html) => {
    const container = document.createElement('div');
    container.innerHTML = html || '';
    const spans = container.querySelectorAll('span.glossary-term, span.grammar-error');
    spans.forEach((el) => {
      const text = el.textContent;
      const textNode = document.createTextNode(text);
      el.parentNode.replaceChild(textNode, el);
    });
    return container.innerHTML;
  };

  const removeDecorations = () => {
    const root = editorRef.current;
    if (!root) return;
    const toClean = root.querySelectorAll('span.glossary-term, span.grammar-error');
    toClean.forEach((el) => {
      const text = el.textContent;
      const textNode = document.createTextNode(text);
      el.parentNode.replaceChild(textNode, el);
    });
  };

  const wrapMatchesInTextNodes = (root, regexFactory, makeSpan) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.parentNode) return NodeFilter.FILTER_REJECT;
        const parent = node.parentNode;
        if (parent.nodeType !== 1) return NodeFilter.FILTER_ACCEPT;
        if (parent.classList && (parent.classList.contains('glossary-term') || parent.classList.contains('grammar-error'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      const regex = regexFactory(text);
      if (!regex) return;
      let match;
      let lastIndex = 0;
      const fragments = [];
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (start > lastIndex) {
          fragments.push(document.createTextNode(text.slice(lastIndex, start)));
        }
        const span = makeSpan(match[0]);
        fragments.push(span);
        lastIndex = end;
        if (regex.lastIndex === start) regex.lastIndex = end;
      }
      if (fragments.length > 0) {
        if (lastIndex < text.length) {
          fragments.push(document.createTextNode(text.slice(lastIndex)));
        }
        const parent = textNode.parentNode;
        fragments.forEach((frag) => parent.insertBefore(frag, textNode));
        parent.removeChild(textNode);
      }
    });
  };

  const applyGlossaryDecorations = () => {
    const root = editorRef.current;
    if (!root || !glossaryTerms || glossaryTerms.length === 0) return;
    glossaryTerms.forEach((t) => {
      const term = t.term;
      const def = t.definition;
      const termEsc = escapeRegExp(term);
      const factory = () => new RegExp('\\b' + termEsc + '\\b', 'gi');
      wrapMatchesInTextNodes(root, () => factory(), (text) => {
        const span = document.createElement('span');
        span.className = 'glossary-term';
        span.dataset.term = term;
        span.dataset.definition = def;
        span.textContent = text;
        return span;
      });
    });
  };

  const applyGrammarDecorations = () => {
    const root = editorRef.current;
    if (!root || !grammarErrors || grammarErrors.length === 0) return;
    grammarErrors.forEach((e) => {
      const errText = e.text;
      const sugg = e.suggestion || '';
      if (!errText) return;
      const errEsc = escapeRegExp(errText);
      const factory = () => new RegExp(errEsc, 'g');
      wrapMatchesInTextNodes(root, () => factory(), (text) => {
        const span = document.createElement('span');
        span.className = 'grammar-error';
        span.dataset.suggestion = sugg;
        span.textContent = text;
        return span;
      });
    });
  };

  const onMouseMove = (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const rect = target.getBoundingClientRect();
    const pos = { x: rect.left + rect.width / 2, y: rect.top - 8 + window.scrollY };
    if (target.classList.contains('glossary-term')) {
      setGlossaryTooltip({ term: target.dataset.term, definition: target.dataset.definition, x: pos.x, y: pos.y });
      setGrammarTooltip(null);
    } else if (target.classList.contains('grammar-error')) {
      setGrammarTooltip({ suggestion: target.dataset.suggestion, x: pos.x, y: pos.y, element: target });
      setGlossaryTooltip(null);
    } else {
      setGlossaryTooltip(null);
      setGrammarTooltip(null);
    }
  };

  const onMouseLeave = () => {
    setGlossaryTooltip(null);
    setGrammarTooltip(null);
  };

  const onClick = (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains('glossary-term')) {
      if (onGlossaryTermClick) {
        onGlossaryTermClick({ term: target.dataset.term, definition: target.dataset.definition });
      }
    }
    if (target.classList.contains('grammar-error')) {
      const suggestion = target.dataset.suggestion;
      if (suggestion) {
        target.textContent = suggestion;
        const parent = target.parentNode;
        if (parent) {
          const text = document.createTextNode(target.textContent);
          parent.replaceChild(text, target);
        }
        handleContentChange();
        setGrammarTooltip(null);
      }
    }
  };

  return (
    <div className="rich-text-editor">
      <div className="toolbar">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => execCommand('bold')}
          title="Bold"
        >
          <FaBold />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => execCommand('italic')}
          title="Italic"
        >
          <FaItalic />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => execCommand('underline')}
          title="Underline"
        >
          <FaUnderline />
        </button>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => execCommand('justifyLeft')}
          title="Align Left"
        >
          <FaAlignLeft />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => execCommand('justifyCenter')}
          title="Align Center"
        >
          <FaAlignCenter />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => execCommand('justifyRight')}
          title="Align Right"
        >
          <FaAlignRight />
        </button>
        <div className="toolbar-divider"></div>
        <div className="font-size-control">
          <FaFont />
          <select
            value={parseInt(fontSize)}
            onChange={handleFontSizeChange}
            className="font-size-select"
            title="Font Size"
          >
            <option value={12}>12</option>
            <option value={14}>14</option>
            <option value={16}>16</option>
            <option value={18}>18</option>
            <option value={20}>20</option>
            <option value={24}>24</option>
            <option value={28}>28</option>
            <option value={32}>32</option>
          </select>
        </div>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          className={`toolbar-button mic-button ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          title={isListening ? 'Stop Recording' : 'Start Recording'}
        >
          {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
      </div>
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        onInput={handleContentChange}
        onBlur={handleContentChange}
        data-placeholder={placeholder}
        style={{ fontSize }}
        suppressContentEditableWarning={true}
      />
      <AnimatePresence>
        {glossaryTooltip && (
          <motion.div
            className="glossary-tooltip"
            style={{ left: glossaryTooltip.x, top: glossaryTooltip.y }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="glossary-tooltip-term">{glossaryTooltip.term}</div>
            <div className="glossary-tooltip-definition">{glossaryTooltip.definition}</div>
          </motion.div>
        )}
        {grammarTooltip && grammarTooltip.suggestion && (
          <motion.div
            className="grammar-tooltip"
            style={{ left: grammarTooltip.x, top: grammarTooltip.y }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grammar-tooltip-title">Suggestion</div>
            <div className="grammar-tooltip-suggestion">{grammarTooltip.suggestion}</div>
            <div className="grammar-tooltip-help">Click to apply</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RichTextEditor;





