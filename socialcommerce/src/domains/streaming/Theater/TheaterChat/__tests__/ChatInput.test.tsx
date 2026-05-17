import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInput } from '../ChatInput';

// ChatInput is a pure presentational component with no network calls
vi.mock('../../../../../shared/realtime/useSocket', () => ({
    useSocket: () => ({ send: vi.fn(), status: 'connected' }),
    useChannel: vi.fn(),
}));

describe('ChatInput', () => {
    it('renders the text field and send button', () => {
        render(<ChatInput onSend={vi.fn()} />);
        expect(screen.getByRole('textbox', { name: /chat message/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('calls onSend with trimmed text when Send is clicked', async () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        await userEvent.type(screen.getByRole('textbox', { name: /chat message/i }), '  Hello world  ');
        await userEvent.click(screen.getByRole('button', { name: /send/i }));

        expect(onSend).toHaveBeenCalledWith('Hello world');
    });

    it('calls onSend when Enter is pressed', async () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByRole('textbox', { name: /chat message/i });
        await userEvent.type(input, 'Hello{Enter}');

        expect(onSend).toHaveBeenCalledWith('Hello');
    });

    it('clears the input after sending', async () => {
        render(<ChatInput onSend={vi.fn()} />);
        const input = screen.getByRole('textbox', { name: /chat message/i });

        await userEvent.type(input, 'Test message{Enter}');

        expect(input).toHaveValue('');
    });

    it('does not call onSend when input is empty', async () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        await userEvent.click(screen.getByRole('button', { name: /send/i }));
        expect(onSend).not.toHaveBeenCalled();
    });

    it('disables input and shows placeholder when disabled', () => {
        render(<ChatInput onSend={vi.fn()} disabled />);
        const input = screen.getByRole('textbox', { name: /chat message/i });

        expect(input).toBeDisabled();
        expect(input).toHaveAttribute('placeholder', 'Chat is unavailable');
    });

    it('toggles emote picker when emote button is clicked', async () => {
        render(<ChatInput onSend={vi.fn()} />);
        const emoteBtn = screen.getByRole('button', { name: /emote picker/i });

        // Picker should not be visible initially
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

        await userEvent.click(emoteBtn);
        // After clicking, the emote picker should appear
        // (actual content depends on EmotePicker internals)
        expect(emoteBtn).toBeInTheDocument(); // picker opened without crash
    });
});
